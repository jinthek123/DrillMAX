use axum::{
    extract::{Query, State},
    http::Method,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};
use tokio::{process::Command, sync::Mutex, time::interval};
use tower_http::cors::{Any, CorsLayer};

static PLAY_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"\[(\d{2}:\d{2}:\d{2})\]\[(미갱신|성공)\](?:\[[^\]]*\])*(?:\([^)]*\))?\s*(\dB)\s+(NM|HD|MX|SC)\s+(.+?)\s*\((\d+(?:\.\d+)?)\s*%\)",
    )
    .expect("play regex")
});

/// 캡쳐 결과 배너: `4B SC 99.72% (MaxCombo)` / `(PerfectPlay)` 등
static FLAG_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)(\dB)\s+(NM|HD|MX|SC)\s+(\d+(?:\.\d+)?)\s*%\s*\(\s*(Max\s*Combo|Perfect\s*Play|PP|MC)\s*\)",
    )
    .expect("flag regex")
});

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayEvent {
    pub id: String,
    pub at: String,
    pub time: String,
    pub status: String,
    pub button: String,
    pub difficulty: String,
    pub title: String,
    pub accuracy: f64,
    pub max_combo: bool,
    pub raw: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotPlay {
    time: String,
    status: String,
    button: String,
    difficulty: String,
    title: String,
    accuracy: f64,
    max_combo: bool,
    raw: String,
}

struct BridgeState {
    events: Vec<PlayEvent>,
    last_html: String,
    last_fingerprint: String,
    initialized: bool,
    client_online: bool,
    last_error: Option<String>,
    nickname: Option<String>,
    reader_path: PathBuf,
}

impl BridgeState {
    fn new(reader_path: PathBuf) -> Self {
        Self {
            events: Vec::new(),
            last_html: String::new(),
            last_fingerprint: String::new(),
            initialized: false,
            client_online: false,
            last_error: None,
            nickname: None,
            reader_path,
        }
    }
}

type Shared = Arc<Mutex<BridgeState>>;

fn strip_html(html: &str) -> String {
    let mut s = html.to_string();
    let patterns = [
        (r"(?is)<script[\s\S]*?</script>", " "),
        (r"(?is)<style[\s\S]*?</style>", " "),
        (r"(?i)<br\s*/?>", "\n"),
        (r"(?i)</li>", "\n"),
        (r"(?i)</p>", "\n"),
        (r"(?i)</div>", "\n"),
        (r"<[^>]+>", ""),
    ];
    for (pat, rep) in patterns {
        if let Ok(re) = Regex::new(pat) {
            s = re.replace_all(&s, rep).into_owned();
        }
    }
    s.replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace('\r', "")
}

/// (button, difficulty, accuracy*100 as i32) → max combo
fn detect_max_combo_flags(text: &str) -> HashSet<(String, String, i32)> {
    let mut out = HashSet::new();
    for m in FLAG_RE.captures_iter(text) {
        let Some(acc) = m.get(3).and_then(|g| g.as_str().parse::<f64>().ok()) else {
            continue;
        };
        let key = (
            m.get(1).unwrap().as_str().to_uppercase(),
            m.get(2).unwrap().as_str().to_uppercase(),
            (acc * 100.0).round() as i32,
        );
        out.insert(key);
    }
    out
}

fn parse_plays(text: &str) -> Vec<SnapshotPlay> {
    let flags = detect_max_combo_flags(text);
    PLAY_RE
        .captures_iter(text)
        .filter_map(|m| {
            let accuracy = m.get(6)?.as_str().parse::<f64>().ok()?;
            let accuracy = (accuracy * 100.0).round() / 100.0;
            let button = m.get(3)?.as_str().to_string();
            let difficulty = m.get(4)?.as_str().to_string();
            let acc_key = (accuracy * 100.0).round() as i32;
            let flagged = flags.contains(&(
                button.to_uppercase(),
                difficulty.to_uppercase(),
                acc_key,
            ));
            let max_combo = flagged || accuracy >= 100.0;
            Some(SnapshotPlay {
                time: m.get(1)?.as_str().to_string(),
                status: m.get(2)?.as_str().to_string(),
                button,
                difficulty,
                title: m.get(5)?.as_str().trim().to_string(),
                accuracy,
                max_combo,
                raw: m.get(0)?.as_str().to_string(),
            })
        })
        .collect()
}

fn detect_nickname(text: &str) -> Option<String> {
    let re1 = Regex::new(r"\[로그인 성공\]\s*([^\s]+)\s*님").ok()?;
    if let Some(c) = re1.captures(text) {
        return Some(c.get(1)?.as_str().to_string());
    }
    let re2 = Regex::new(r"([A-Za-z0-9_\-]{2,20})\s*님").ok()?;
    re2.captures(text)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
}

fn fingerprint(plays: &[SnapshotPlay]) -> String {
    plays
        .iter()
        .map(|p| {
            format!(
                "{}|{}|{}|{}|{}|{}|{}",
                p.time,
                p.status,
                p.button,
                p.difficulty,
                p.title,
                p.accuracy,
                if p.max_combo { 1 } else { 0 }
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

async fn run_reader(reader: &Path) -> (i32, String, String) {
    let mut cmd = Command::new(reader);
    cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return (-1, String::new(), e.to_string()),
    };

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let (code, out, err) = tokio::join!(
        async {
            match child.wait().await {
                Ok(s) => s.code().unwrap_or(-1),
                Err(_) => -1,
            }
        },
        async {
            let mut buf = Vec::new();
            if let Some(mut s) = stdout {
                let _ = tokio::io::AsyncReadExt::read_to_end(&mut s, &mut buf).await;
            }
            String::from_utf8_lossy(&buf).into_owned()
        },
        async {
            let mut buf = Vec::new();
            if let Some(mut s) = stderr {
                let _ = tokio::io::AsyncReadExt::read_to_end(&mut s, &mut buf).await;
            }
            String::from_utf8_lossy(&buf).into_owned()
        }
    );
    (code, out, err)
}

async fn tick(state: &Shared) {
    let reader = {
        let g = state.lock().await;
        g.reader_path.clone()
    };
    let (code, html, err) = run_reader(&reader).await;
    let mut g = state.lock().await;
    if code != 0 || html.is_empty() {
        g.client_online = false;
        g.last_error = Some(if err.is_empty() {
            "V-ARCHIVE 클라이언트 로그를 읽지 못함".into()
        } else {
            err
        });
        return;
    }
    g.client_online = true;
    g.last_error = None;
    if html == g.last_html {
        return;
    }
    g.last_html = html.clone();

    let text = strip_html(&html);
    if let Some(nick) = detect_nickname(&text) {
        g.nickname = Some(nick);
    }
    let plays = parse_plays(&text);
    let fp = fingerprint(&plays);

    if !g.initialized {
        g.initialized = true;
        g.last_fingerprint = fp;
        return;
    }
    if fp == g.last_fingerprint {
        return;
    }

    let prev: HashSet<String> = g
        .last_fingerprint
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();
    g.last_fingerprint = fp;

    let fresh: Vec<_> = plays
        .into_iter()
        .filter(|p| {
            let key = format!(
                "{}|{}|{}|{}|{}|{}|{}",
                p.time,
                p.status,
                p.button,
                p.difficulty,
                p.title,
                p.accuracy,
                if p.max_combo { 1 } else { 0 }
            );
            !prev.contains(&key)
        })
        .collect();

    for p in fresh.into_iter().rev() {
        let id = format!(
            "{}-{}-{}",
            chrono::Utc::now().timestamp_millis(),
            g.events.len(),
            &uuid::Uuid::new_v4().to_string()[..5]
        );
        g.events.push(PlayEvent {
            id,
            at: chrono::Utc::now().to_rfc3339(),
            time: p.time,
            status: p.status,
            button: p.button,
            difficulty: p.difficulty,
            title: p.title,
            accuracy: p.accuracy,
            max_combo: p.max_combo,
            raw: p.raw,
        });
    }
    if g.events.len() > 500 {
        let drain = g.events.len() - 500;
        g.events.drain(0..drain);
    }
}

#[derive(serde::Deserialize)]
struct EventsQuery {
    since: Option<String>,
}

async fn health(State(state): State<Shared>) -> impl IntoResponse {
    let g = state.lock().await;
    Json(serde_json::json!({
        "ok": true,
        "clientOnline": g.client_online,
        "nickname": g.nickname,
        "lastError": g.last_error,
        "eventCount": g.events.len(),
    }))
}

async fn events(State(state): State<Shared>, Query(q): Query<EventsQuery>) -> impl IntoResponse {
    let g = state.lock().await;
    let list: Vec<_> = if let Some(since) = q.since {
        g.events.iter().filter(|e| e.at > since).cloned().collect()
    } else {
        let start = g.events.len().saturating_sub(20);
        g.events[start..].to_vec()
    };
    Json(serde_json::json!({
        "clientOnline": g.client_online,
        "nickname": g.nickname,
        "lastError": g.last_error,
        "events": list,
        "serverTime": chrono::Utc::now().to_rfc3339(),
    }))
}

async fn snapshot(State(state): State<Shared>) -> impl IntoResponse {
    let g = state.lock().await;
    let plays = parse_plays(&strip_html(&g.last_html));
    Json(serde_json::json!({
        "clientOnline": g.client_online,
        "nickname": g.nickname,
        "lastError": g.last_error,
        "plays": plays,
    }))
}

pub async fn start_bridge(reader_path: PathBuf, port: u16, poll_ms: u64) -> Result<(), String> {
    let state = Arc::new(Mutex::new(BridgeState::new(reader_path.clone())));

    let poll_state = state.clone();
    tokio::spawn(async move {
        let mut tick_timer = interval(Duration::from_millis(poll_ms));
        loop {
            tick_timer.tick().await;
            tick(&poll_state).await;
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/events", get(events))
        .route("/api/snapshot", get(snapshot))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port))
        .await
        .map_err(|e| format!("브리지 포트 {port} bind 실패: {e}"))?;

    eprintln!(
        "[rhythmform-bridge] http://127.0.0.1:{port} reader={}",
        reader_path.display()
    );

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("브리지 서버 오류: {e}"))?;
    Ok(())
}

pub fn resolve_reader_path(resource_dir: &Path) -> PathBuf {
    let candidates = [
        resource_dir.join("resources").join("IeHtmlReader.exe"),
        resource_dir.join("IeHtmlReader.exe"),
        resource_dir.join("bridge").join("IeHtmlReader.exe"),
        // `tauri dev` — resource_dir ≈ src-tauri
        resource_dir
            .join("..")
            .join("bridge")
            .join("IeHtmlReader.exe"),
    ];
    for c in &candidates {
        if c.is_file() {
            return c.clone();
        }
    }
    candidates[0].clone()
}

use serde::Serialize;
use std::time::Duration;

const LATEST_URL: &str = "https://api.github.com/repos/jinthek123/DrillMAX/releases/latest";
const DOWNLOAD_PREFIX: &str = "https://github.com/jinthek123/DrillMAX/releases/download/";
const MAX_BYTES: u64 = 150 * 1024 * 1024;
const MIN_BYTES: u64 = 50_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReport {
    pub state: &'static str,
    pub detail: String,
}

#[derive(serde::Deserialize)]
struct Release {
    tag_name: String,
    assets: Vec<Asset>,
}

#[derive(serde::Deserialize)]
struct Asset {
    name: String,
    browser_download_url: String,
}

fn parse_version(raw: &str) -> Option<(u64, u64, u64)> {
    let core = raw
        .trim()
        .trim_start_matches(['v', 'V'])
        .split(['-', '+'])
        .next()
        .unwrap_or("");
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = match parts.next() {
        Some(value) => value.parse().ok()?,
        None => 0,
    };
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch))
}

fn is_setup_name(name: &str) -> bool {
    name.starts_with("DrillMAX_") && name.ends_with("_x64-setup.exe") && !name.contains("..")
}

fn trusted_download(url: &str) -> bool {
    let Ok(parsed) = reqwest::Url::parse(url) else {
        return false;
    };
    parsed.scheme() == "https"
        && parsed.host_str() == Some("github.com")
        && parsed.path().starts_with("/jinthek123/DrillMAX/releases/download/")
        && url.starts_with(DOWNLOAD_PREFIX)
}

fn trusted_redirect(url: &reqwest::Url) -> bool {
    if url.scheme() != "https" {
        return false;
    }
    match url.host_str() {
        Some("github.com") => true,
        Some(host) => host.ends_with(".githubusercontent.com"),
        None => false,
    }
}

fn github_client() -> Result<reqwest::Client, UpdateReport> {
    reqwest::Client::builder()
        .user_agent("DrillMAX")
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() < 8 && trusted_redirect(attempt.url()) {
                attempt.follow()
            } else {
                attempt.stop()
            }
        }))
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|_| failed("업데이트를 확인하지 못했습니다."))
}

fn failed(detail: &str) -> UpdateReport {
    UpdateReport {
        state: "failed",
        detail: detail.to_string(),
    }
}

async fn latest_release(client: &reqwest::Client) -> Result<Release, UpdateReport> {
    let response = client
        .get(LATEST_URL)
        .header("accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|_| failed("업데이트를 확인하지 못했습니다."))?;
    if !response.status().is_success() {
        return Err(failed("업데이트를 확인하지 못했습니다."));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| failed("업데이트를 확인하지 못했습니다."))?;
    serde_json::from_slice(&bytes).map_err(|_| failed("업데이트를 확인하지 못했습니다."))
}

fn setup_asset(release: &Release) -> Result<&Asset, UpdateReport> {
    release
        .assets
        .iter()
        .find(|asset| is_setup_name(&asset.name) && trusted_download(&asset.browser_download_url))
        .ok_or_else(|| failed("설치 파일을 찾지 못했습니다."))
}

#[tauri::command]
pub async fn install_app_update(app: tauri::AppHandle) -> UpdateReport {
    let current = app.package_info().version.to_string();
    let Some(current_version) = parse_version(&current) else {
        return failed("업데이트를 확인하지 못했습니다.");
    };
    let client = match github_client() {
        Ok(client) => client,
        Err(report) => return report,
    };
    let release = match latest_release(&client).await {
        Ok(release) => release,
        Err(report) => return report,
    };
    let Some(latest_version) = parse_version(&release.tag_name) else {
        return failed("업데이트를 확인하지 못했습니다.");
    };
    if latest_version <= current_version {
        return UpdateReport {
            state: "current",
            detail: String::new(),
        };
    }
    let asset = match setup_asset(&release) {
        Ok(asset) => asset,
        Err(report) => return report,
    };
    let url = asset.browser_download_url.clone();
    let (major, minor, patch) = latest_version;
    let file_name = format!("DrillMAX_{major}.{minor}.{patch}_x64-setup.exe");
    let response = match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => response,
        _ => return failed("설치 파일을 받지 못했습니다."),
    };
    if response.content_length().is_some_and(|len| len > MAX_BYTES || len < MIN_BYTES) {
        return failed("설치 파일을 받지 못했습니다.");
    }
    let bytes = match response.bytes().await {
        Ok(bytes) => bytes,
        Err(_) => return failed("설치 파일을 받지 못했습니다."),
    };
    if bytes.len() as u64 > MAX_BYTES
        || (bytes.len() as u64) < MIN_BYTES
        || !bytes.starts_with(b"MZ")
    {
        return failed("설치 파일을 받지 못했습니다.");
    }
    let mut path = std::env::temp_dir();
    path.push(&file_name);
    let saved = tokio::task::spawn_blocking(move || std::fs::write(&path, &bytes)).await;
    if saved.map_or(true, |result| result.is_err()) {
        return failed("설치 파일을 받지 못했습니다.");
    }
    let mut installer = std::env::temp_dir();
    installer.push(file_name);
    if std::process::Command::new(&installer).spawn().is_err() {
        return failed("설치 파일을 실행하지 못했습니다.");
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(700)).await;
        app.exit(0);
    });
    UpdateReport {
        state: "installing",
        detail: String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::{is_setup_name, parse_version, trusted_download};

    #[test]
    fn version_order() {
        assert!(parse_version("v1.1.2") > parse_version("1.1.1"));
        assert_eq!(parse_version("v1.1.1"), parse_version("1.1.1"));
        assert!(parse_version("1.1.0") < parse_version("1.1.1"));
        assert!(parse_version("1.1.1-beta") == parse_version("1.1.1"));
        assert!(parse_version("1.1").is_some());
        assert!(parse_version("nope").is_none());
    }

    #[test]
    fn setup_asset_name() {
        assert!(is_setup_name("DrillMAX_1.1.2_x64-setup.exe"));
        assert!(!is_setup_name("DrillMAX_1.1.2_x64-setup.exe.sig"));
        assert!(!is_setup_name("../DrillMAX_1.1.2_x64-setup.exe"));
    }

    #[test]
    fn download_host() {
        assert!(trusted_download(
            "https://github.com/jinthek123/DrillMAX/releases/download/v1.1.2/DrillMAX_1.1.2_x64-setup.exe"
        ));
        assert!(!trusted_download(
            "https://example.com/jinthek123/DrillMAX/releases/download/v1.1.2/DrillMAX_1.1.2_x64-setup.exe"
        ));
    }
}

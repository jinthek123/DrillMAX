mod bridge;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
                let _ = w.unminimize();
            }
        }))
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default());

            // In `tauri dev`, resource_dir points at src-tauri; reader falls back to ../bridge
            let reader = bridge::resolve_reader_path(&resource_dir);
            if !reader.is_file() {
                eprintln!(
                    "[rhythmform] IeHtmlReader not found at {} — LIVE disabled until present",
                    reader.display()
                );
            }

            tauri::async_runtime::spawn(async move {
                if let Err(e) = bridge::start_bridge(reader, 5174, 900).await {
                    eprintln!("[rhythmform-bridge] {e}");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running RhythmForm");
}

#[test]
fn pdf_preview_can_load_a_blob_frame() {
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).expect("Tauri configuration");
    let frames = config["app"]["security"]["csp"]["frame-src"]
        .as_str()
        .expect("explicit frame policy");

    assert!(frames.split_whitespace().any(|source| source == "blob:"));
}

fn main() {
    if std::env::args().any(|argument| argument == "--analysis-evidence") {
        std::process::exit(drawscope_desktop::analysis_evidence_cli());
    }
    if std::env::args().any(|argument| argument == "--analysis-health-check") {
        std::process::exit(drawscope_desktop::analysis_health_check_cli());
    }
    if std::env::args().any(|argument| argument == "--health-check") {
        std::process::exit(drawscope_desktop::health_check_cli());
    }
    drawscope_desktop::run();
}

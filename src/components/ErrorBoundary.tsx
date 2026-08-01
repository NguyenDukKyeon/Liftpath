import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LiftPath render error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-screen">
        <section className="card">
          <span className="eyebrow">LIFTPATH RECOVERY</span>
          <h1>Ứng dụng gặp lỗi hiển thị</h1>
          <p>Dữ liệu của bạn vẫn được giữ trong trình duyệt. Hãy tải lại trang; nếu lỗi lặp lại, xuất backup từ bản trước hoặc xóa cache ứng dụng.</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>Tải lại ứng dụng</button>
          <details><summary>Chi tiết kỹ thuật</summary><pre>{this.state.error.message}</pre></details>
        </section>
      </main>
    );
  }
}

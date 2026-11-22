/**
 * Zero-overhead Reader Open Benchmark for development profiling.
 * In production (__DEV__ === false), calls are complete no-ops.
 */
class ReaderBenchmark {
  private t0 = 0;
  private t1 = 0;
  private t2 = 0;
  private bookId = '';

  markT0(bookId: string) {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    this.bookId = bookId;
    this.t0 = Date.now();
    this.t1 = 0;
    this.t2 = 0;
  }

  markT1() {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    if (!this.t0) return;
    this.t1 = Date.now();
  }

  markT2() {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    if (!this.t0) return;
    this.t2 = Date.now();
  }

  markT3(pageNumber: number) {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    if (!this.t0) return;
    const t3 = Date.now();
    const tTotal = t3 - this.t0;
    const accessMs = this.t1 ? this.t1 - this.t0 : 0;
    const navMs = this.t2 && this.t1 ? this.t2 - this.t1 : this.t2 ? this.t2 - this.t0 : 0;
    const renderMs = this.t2 ? t3 - this.t2 : t3 - this.t0;
    console.log(
      `⏱️ [BASELINE] Book: ${this.bookId} | Page: ${pageNumber} | T_final: ${tTotal}ms (CheckAccess: ${accessMs}ms, Navigation: ${navMs}ms, ImageLoad: ${renderMs}ms)`
    );
    this.t0 = 0;
  }
}

export const readerBenchmark = new ReaderBenchmark();

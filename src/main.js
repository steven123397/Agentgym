const app = document.querySelector("#app");

if (!app) {
  throw new Error("Missing #app mount point");
}

app.innerHTML = `
  <section class="baseline" aria-labelledby="baseline-title">
    <p class="eyebrow">Agentgym baseline</p>
    <h1 id="baseline-title">专注任务规划器</h1>
    <p>基座已就绪。请先阅读 docs/TASK.md，并在实现前创建 docs/DESIGN.md。</p>
  </section>
`;
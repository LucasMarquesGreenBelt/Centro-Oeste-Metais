const storageKey = "centro-oeste-metais-order-draft";

const form = document.querySelector("[data-order-form]");
const itemsRoot = document.querySelector("[data-items]");
const addItemButton = document.querySelector("[data-add-item]");
const copyButton = document.querySelector("[data-copy-order]");
const whatsappButton = document.querySelector("[data-send-whatsapp]");
const resetButton = document.querySelector("[data-reset-form]");
const summaryOutput = document.querySelector("[data-summary-output]");
const toast = document.querySelector("[data-toast]");

const defaultItem = {
  categoria: "Tubo",
  especificacao: "",
  quantidade: "",
  unidade: "un",
};

const fieldLabels = {
  nome: "Nome",
  empresa: "Empresa",
  telefone: "Telefone",
  cidade: "Cidade",
  tipoSolicitacao: "Tipo de solicitacao",
  prazo: "Prazo",
  recebimento: "Forma de recebimento",
  etapaProjeto: "Etapa do projeto",
  observacoes: "Observacoes",
};

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();

  const copied = document.execCommand("copy");
  helper.remove();

  if (!copied) {
    throw new Error("copy-failed");
  }

  return Promise.resolve();
}

function formatDate(value) {
  if (!value) return "Nao informado";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function createItemRow(item = defaultItem) {
  const row = document.createElement("div");
  row.className = "order-item";
  row.innerHTML = `
    <label>
      Categoria
      <select name="categoria">
        <option value="Tubo">Tubo</option>
        <option value="Chapa">Chapa</option>
        <option value="Perfil">Perfil</option>
        <option value="Viga">Viga</option>
        <option value="Barra">Barra</option>
        <option value="Estrutura sob medida">Estrutura sob medida</option>
        <option value="Outro">Outro</option>
      </select>
    </label>
    <label>
      Especificacao
      <input
        type="text"
        name="especificacao"
        placeholder="Ex.: tubo 40x40, chapa 3 mm, perfil U"
      />
    </label>
    <label>
      Quantidade
      <input type="number" min="1" step="1" name="quantidade" placeholder="0" />
    </label>
    <label>
      Unidade
      <select name="unidade">
        <option value="un">un</option>
        <option value="barra">barra</option>
        <option value="kg">kg</option>
        <option value="m">m</option>
        <option value="m2">m2</option>
      </select>
    </label>
    <button class="button button--ghost-light" type="button" data-remove-item aria-label="Remover item">
      X
    </button>
  `;

  row.querySelector('[name="categoria"]').value = item.categoria || defaultItem.categoria;
  row.querySelector('[name="especificacao"]').value =
    item.especificacao || defaultItem.especificacao;
  row.querySelector('[name="quantidade"]').value = item.quantidade || defaultItem.quantidade;
  row.querySelector('[name="unidade"]').value = item.unidade || defaultItem.unidade;

  row.addEventListener("input", persistAndRender);
  row.addEventListener("change", persistAndRender);
  row.querySelector("[data-remove-item]").addEventListener("click", () => {
    row.remove();

    if (!itemsRoot.children.length) {
      itemsRoot.append(createItemRow());
    }

    persistAndRender();
  });

  return row;
}

function readItems() {
  return [...itemsRoot.querySelectorAll(".order-item")]
    .map((row) => ({
      categoria: row.querySelector('[name="categoria"]').value.trim(),
      especificacao: row.querySelector('[name="especificacao"]').value.trim(),
      quantidade: row.querySelector('[name="quantidade"]').value.trim(),
      unidade: row.querySelector('[name="unidade"]').value.trim(),
    }))
    .filter(
      (item) => item.categoria || item.especificacao || item.quantidade || item.unidade,
    );
}

function getFormData() {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.items = readItems();
  return data;
}

function buildSummary(data) {
  const items = data.items.length
    ? data.items
        .map((item, index) => {
          const detail = item.especificacao || "Especificacao a confirmar";
          const quantity = item.quantidade
            ? `${item.quantidade} ${item.unidade}`
            : `Quantidade a confirmar (${item.unidade})`;
          return `${index + 1}. ${item.categoria} - ${detail} - ${quantity}`;
        })
        .join("\n")
    : "1. Nenhum item detalhado ainda";

  const lines = [
    "Solicitacao de Orcamento - Centro Oeste Metais",
    "",
    `${fieldLabels.nome}: ${data.nome?.trim() || "Nao informado"}`,
    `${fieldLabels.empresa}: ${data.empresa?.trim() || "Nao informado"}`,
    `${fieldLabels.telefone}: ${data.telefone?.trim() || "Nao informado"}`,
    `${fieldLabels.cidade}: ${data.cidade?.trim() || "Nao informado"}`,
    `${fieldLabels.tipoSolicitacao}: ${data.tipoSolicitacao || "Nao informado"}`,
    `${fieldLabels.prazo}: ${formatDate(data.prazo)}`,
    `${fieldLabels.recebimento}: ${data.recebimento || "Nao informado"}`,
    `${fieldLabels.etapaProjeto}: ${data.etapaProjeto || "Nao informado"}`,
    "",
    "Itens:",
    items,
    "",
    `${fieldLabels.observacoes}: ${data.observacoes?.trim() || "Sem observacoes"}`,
  ];

  return lines.join("\n");
}

function persistDraft(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function renderSummary() {
  const data = getFormData();
  const summary = buildSummary(data);
  summaryOutput.textContent = summary;
  persistDraft(data);
  return summary;
}

function persistAndRender() {
  renderSummary();
}

function populateForm(draft) {
  Object.entries(draft).forEach(([key, value]) => {
    if (key === "items") return;
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });

  itemsRoot.innerHTML = "";
  const items = draft.items?.length ? draft.items : [defaultItem];
  items.forEach((item) => itemsRoot.append(createItemRow(item)));
}

function resetForm() {
  form.reset();
  itemsRoot.innerHTML = "";
  itemsRoot.append(createItemRow());
  localStorage.removeItem(storageKey);
  renderSummary();
}

function openWhatsapp(summary) {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 },
  );

  elements.forEach((element) => observer.observe(element));
}

addItemButton.addEventListener("click", () => {
  itemsRoot.append(createItemRow());
  persistAndRender();
});

form.addEventListener("input", persistAndRender);
form.addEventListener("change", persistAndRender);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderSummary();
  showToast("Resumo atualizado e pronto para envio.");
});

copyButton.addEventListener("click", async () => {
  const summary = renderSummary();

  try {
    await copyText(summary);
    showToast("Resumo copiado com sucesso.");
  } catch (error) {
    showToast("Nao foi possivel copiar automaticamente.");
  }
});

whatsappButton.addEventListener("click", () => {
  const summary = renderSummary();
  openWhatsapp(summary);
});

resetButton.addEventListener("click", () => {
  resetForm();
  showToast("Formulario limpo.");
});

const savedDraft = localStorage.getItem(storageKey);

if (savedDraft) {
  try {
    populateForm(JSON.parse(savedDraft));
  } catch (error) {
    resetForm();
  }
} else {
  itemsRoot.append(createItemRow());
}

renderSummary();
setupReveal();

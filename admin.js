/* ============================================================
   BATALHA DA ALCATÉIA
   PAINEL ADMINISTRATIVO
   ADMIN.JS — VERSÃO SUPABASE
   ============================================================ */

/* =========================
   CONFIGURAÇÃO SUPABASE
   ========================= */

const SUPABASE_URL =
  "https://xrvefgqycejiuokdmfio.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_iCYF-r1R-VVcVHvlFJkxWg_R-urdYYA";

let sb = null;


/* =========================
   VARIÁVEIS
   ========================= */

let mcs = [];
let editingId = null;
let photoData = "";
let currentUser = null;


/* =========================
   UTILITÁRIOS
   ========================= */

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showMessage(message, type = "normal") {
  const toast = $("#toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  if (type === "error") {
    toast.style.background = "#c40000";
  } else if (type === "success") {
    toast.style.background = "#087f35";
  } else {
    toast.style.background = "#111";
  }

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


function showLoginMessage(message, error = false) {
  const box = $("#loginMessage");

  if (!box) {
    alert(message);
    return;
  }

  box.innerHTML =
    `<div class="message" style="
      color:${error ? "#ff6b6b" : "#7cff9b"};
      margin-top:10px;
    ">${escapeHtml(message)}</div>`;
}


/* =========================
   INICIALIZAÇÃO SUPABASE
   ========================= */

function initializeSupabase() {

  if (!window.supabase) {
    showLoginMessage(
      "Erro: a biblioteca do Supabase não foi carregada. " +
      "Vamos corrigir o admin.html no próximo passo.",
      true
    );

    console.error(
      "Supabase JS não encontrado. " +
      "O admin.html precisa carregar @supabase/supabase-js."
    );

    return false;
  }

  sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return true;
}


/* =========================
   LOGIN
   ========================= */

async function login() {

  if (!sb) {
    showLoginMessage(
      "O sistema ainda não conseguiu conectar ao Supabase.",
      true
    );
    return;
  }

  const email = $("#loginEmail")?.value.trim();
  const password = $("#loginPassword")?.value;

  if (!email || !password) {
    showLoginMessage(
      "Preencha o e-mail e a senha.",
      true
    );
    return;
  }

  showLoginMessage("Entrando...");

  try {

    const { data, error } =
      await sb.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {

      console.error("Erro de login:", error);

      showLoginMessage(
        "Não foi possível entrar: " + error.message,
        true
      );

      return;
    }

    if (!data || !data.user) {

      showLoginMessage(
        "O Supabase não retornou o usuário.",
        true
      );

      return;
    }

    currentUser = data.user;

    /*
      Verifica se o usuário está cadastrado
      na tabela public.admin_users.
    */

    const { data: adminUser, error: adminError } =
      await sb
        .from("admin_users")
        .select("user_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (adminError) {

      console.error(
        "Erro ao verificar administrador:",
        adminError
      );

      await sb.auth.signOut();

      showLoginMessage(
        "Login realizado, mas não foi possível verificar " +
        "a autorização do administrador: " +
        adminError.message,
        true
      );

      return;
    }

    if (!adminUser) {

      await sb.auth.signOut();

      showLoginMessage(
        "Este usuário não está autorizado como administrador.",
        true
      );

      return;
    }

    /*
      LOGIN APROVADO
    */

    showLoginMessage(
      "Login realizado com sucesso!"
    );

    $("#loginBox")?.classList.add("hidden");
    $("#adminPanel")?.classList.remove("hidden");

    await loadAllData();

    showMessage(
      "Bem-vindo ao painel da Batalha da Alcatéia!",
      "success"
    );

  } catch (error) {

    console.error("Erro inesperado no login:", error);

    showLoginMessage(
      "Erro inesperado: " + error.message,
      true
    );
  }
}


/* =========================
   LOGOUT
   ========================= */

async function logout() {

  try {

    if (sb) {
      await sb.auth.signOut();
    }

  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  mcs = [];

  $("#loginBox")?.classList.remove("hidden");
  $("#adminPanel")?.classList.add("hidden");

  showLoginMessage("Você saiu do painel.");

}


/* =========================
   VERIFICAR SESSÃO
   ========================= */

async function checkSession() {

  if (!sb) return;

  try {

    const {
      data,
      error
    } = await sb.auth.getSession();

    if (error) {
      console.error(error);
      return;
    }

    if (!data.session) {
      return;
    }

    currentUser = data.session.user;

    /*
      Verifica administrador.
    */

    const {
      data: adminUser,
      error: adminError
    } = await sb
      .from("admin_users")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (adminError || !adminUser) {

      await sb.auth.signOut();

      return;
    }

    $("#loginBox")?.classList.add("hidden");
    $("#adminPanel")?.classList.remove("hidden");

    await loadAllData();

  } catch (error) {

    console.error(
      "Erro ao verificar sessão:",
      error
    );
  }
}


/* =========================
   CARREGAR MCs
   ========================= */

async function loadMcs() {

  if (!sb) return;

  try {

    const {
      data,
      error
    } = await sb
      .from("mcs")
      .select("*")
      .order("points", {
        ascending: false
      });

    if (error) {

      console.error(
        "Erro ao carregar MCs:",
        error
      );

      /*
        Algumas versões do banco podem usar
        pontos em vez de points.
      */

      const fallback =
        await sb
          .from("mcs")
          .select("*")
          .order("pontos", {
            ascending: false
          });

      if (fallback.error) {

        showMessage(
          "Erro ao carregar MCs: " +
          error.message,
          "error"
        );

        return;
      }

      mcs = fallback.data || [];

    } else {

      mcs = data || [];

    }

    renderMcs();
    renderDashboard();
    renderFullRanking();

  } catch (error) {

    console.error(error);

    showMessage(
      "Erro ao carregar MCs: " +
      error.message,
      "error"
    );
  }
}


/* =========================
   NORMALIZAR MC
   ========================= */

function normalizeMc(mc) {

  return {

    id: mc.id,

    nome:
      mc.nome ??
      mc.name ??
      "",

    instagram:
      mc.instagram ??
      "",

    pix:
      mc.pix ??
      mc.pix_key ??
      "",

    participacoes:
      Number(
        mc.participacoes ??
        mc.participations ??
        0
      ),

    titulos:
      Number(
        mc.titulos ??
        mc.titles ??
        0
      ),

    derrotas:
      Number(
        mc.derrotas ??
        mc.losses ??
        0
      ),

    twolalas:
      Number(
        mc.twolalas ??
        mc.two_lalas ??
        0
      ),

    pontos:
      Number(
        mc.pontos ??
        mc.points ??
        0
      ),

    bio:
      mc.bio ??
      mc.biography ??
      "",

    melhorRima:
      mc.melhorRima ??
      mc.best_rhyme ??
      "",

    foto:
      mc.foto ??
      mc.photo_url ??
      ""

  };
}


/* =========================
   APROVEITAMENTO
   ========================= */

function calculatePerformance(mc) {

  const participacoes =
    Number(mc.participacoes || 0);

  const derrotas =
    Number(mc.derrotas || 0);

  if (!participacoes) return 0;

  const resultado =
    ((participacoes - derrotas) /
      participacoes) *
    100;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(resultado)
    )
  );
}


/* =========================
   RENDER MCs
   ========================= */

function renderMcs() {

  const container = $("#mcAdminList");

  if (!container) return;

  const search =
    ($("#searchInput")?.value || "")
      .trim()
      .toLowerCase();

  const sort =
    $("#sortSelect")?.value ||
    "pontos";

  let list =
    mcs
      .map(normalizeMc)
      .filter(mc => {

        const text =
          (
            mc.nome +
            " " +
            mc.instagram
          ).toLowerCase();

        return text.includes(search);

      });


  list.sort((a, b) => {

    if (sort === "nome") {
      return a.nome.localeCompare(
        b.nome,
        "pt-BR"
      );
    }

    return Number(
      b[sort] || 0
    ) -
    Number(
      a[sort] || 0
    );

  });


  const empty =
    $("#emptyState");

  if (empty) {
    empty.hidden =
      list.length !== 0;
  }


  container.innerHTML =
    list.map(mc => {

      const performance =
        calculatePerformance(mc);

      return `

        <article class="mc-row">

          <div class="mc-avatar">

            ${
              mc.foto

              ? `
                <img
                  src="${escapeHtml(mc.foto)}"
                  alt=""
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                  "
                >
              `

              : `
                FOTO<br>MC
              `
            }

          </div>


          <div>

            <h3>
              ${escapeHtml(mc.nome)}
            </h3>

            <p>
              ${
                escapeHtml(
                  mc.instagram ||
                  "Instagram não informado"
                )
              }
              •
              ${performance}%
              aproveitamento
            </p>


            <div class="mc-stats">

              <span>
                ${mc.pontos} PONTOS
              </span>

              <span>
                ${mc.participacoes}
                PARTICIPAÇÕES
              </span>

              <span>
                ${mc.titulos}
                TÍTULOS
              </span>

              <span>
                ${mc.derrotas}
                DERROTAS
              </span>

              <span>
                ${mc.twolalas}
                TWO LALAS
              </span>

            </div>

          </div>


          <div class="row-actions">

            <button
              class="icon-btn"
              data-edit="${mc.id}"
            >
              ✎ EDITAR
            </button>

            <button
              class="icon-btn delete"
              data-delete="${mc.id}"
            >
              🗑
            </button>

          </div>

        </article>

      `;

    }).join("");


  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.onclick = () => {

        openEditor(
          button.dataset.edit
        );

      };

    });


  document
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.onclick = () => {

        deleteMc(
          button.dataset.delete
        );

      };

    });

}


/* =========================
   DASHBOARD
   ========================= */

function renderDashboard() {

  const normalized =
    mcs.map(normalizeMc);


  const points =
    normalized.reduce(
      (total, mc) =>
        total +
        Number(mc.pontos || 0),
      0
    );


  const titles =
    normalized.reduce(
      (total, mc) =>
        total +
        Number(mc.titulos || 0),
      0
    );


  const twolalas =
    normalized.reduce(
      (total, mc) =>
        total +
        Number(mc.twolalas || 0),
      0
    );


  if ($("#metricMcs"))
    $("#metricMcs").textContent =
      normalized.length;


  if ($("#metricPoints"))
    $("#metricPoints").textContent =
      points;


  if ($("#metricTitles"))
    $("#metricTitles").textContent =
      titles;


  if ($("#metricTwolalas"))
    $("#metricTwolalas").textContent =
      twolalas;


  const ranking =
    [...normalized]
      .sort(
        (a, b) =>
          b.pontos - a.pontos
      )
      .slice(0, 8);


  if ($("#dashRanking")) {

    $("#dashRanking").innerHTML =
      ranking.length

        ? ranking.map(
            (mc, index) => `

              <div class="mini-rank">

                <b>
                  ${index + 1}º
                </b>

                <strong>
                  ${escapeHtml(mc.nome)}
                </strong>

                <span>
                  ${mc.pontos} pts
                </span>

              </div>

            `
          ).join("")

        : "<p>Nenhum MC cadastrado.</p>";

  }

}


/* =========================
   RANKING COMPLETO
   ========================= */

function renderFullRanking() {

  const container =
    $("#fullRanking");

  if (!container) return;


  const sorted =
    [...mcs]
      .map(normalizeMc)
      .sort(
        (a, b) =>
          b.pontos - a.pontos
      );


  if (!sorted.length) {

    container.innerHTML =
      "<p>Nenhum MC cadastrado.</p>";

    return;
  }


  container.innerHTML =
    sorted.map(
      (mc, index) => {

        return `

          <div class="full-rank">

            <div class="position">
              ${index + 1}º
            </div>

            <div>

              <strong>
                ${escapeHtml(mc.nome)}
              </strong>

              <small>
                ${
                  index < 3
                    ? "PÓDIO"
                    : index < 8
                      ? "CLASSIFICADO"
                      : "RANKING"
                }
              </small>

            </div>

            <div>

              <strong>
                ${mc.pontos}
              </strong>

              <small>
                PONTOS
              </small>

            </div>

            <div>

              <strong>
                ${mc.titulos}
              </strong>

              <small>
                TÍTULOS
              </small>

            </div>

            <div>

              <strong>
                ${mc.twolalas}
              </strong>

              <small>
                TWO LALAS
              </small>

            </div>

            <div>

              <strong>
                ${mc.participacoes}
              </strong>

              <small>
                PARTICIPAÇÕES
              </small>

            </div>

          </div>

        `;

      }
    ).join("");

}


/* =========================
   EDITAR MC
   ========================= */

function resetForm() {

  $("#mcForm")?.reset();

  editingId = null;
  photoData = "";

  if ($("#mcId"))
    $("#mcId").value = "";

  if ($("#modalTitle"))
    $("#modalTitle").textContent =
      "NOVO MC";

  if ($("#modalEyebrow"))
    $("#modalEyebrow").textContent =
      "CADASTRO";

  if ($("#photoPreview"))
    $("#photoPreview").innerHTML =
      "FOTO<br>DO MC";

  if ($("#previewName"))
    $("#previewName").textContent =
      "NOME DO MC";

  if ($("#previewMeta"))
    $("#previewMeta").textContent =
      "0 pontos • 0 títulos • 0 Twolalas";

}


function openEditor(id = null) {

  resetForm();

  editingId = id;


  if (id) {

    const original =
      mcs.find(
        mc => String(mc.id) === String(id)
      );

    if (!original) {

      showMessage(
        "MC não encontrado.",
        "error"
      );

      return;
    }


    const mc =
      normalizeMc(original);


    $("#modalTitle").textContent =
      "EDITAR MC";

    $("#modalEyebrow").textContent =
      "EDIÇÃO";


    $("#mcId").value =
      mc.id || "";

    $("#mcNome").value =
      mc.nome || "";

    $("#mcInstagram").value =
      mc.instagram || "";

    $("#mcPix").value =
      mc.pix || "";

    $("#mcParticipacoes").value =
      mc.participacoes || 0;

    $("#mcTitulos").value =
      mc.titulos || 0;

    $("#mcDerrotas").value =
      mc.derrotas || 0;

    $("#mcTwolalas").value =
      mc.twolalas || 0;

    $("#mcPontos").value =
      mc.pontos || 0;

    $("#mcBio").value =
      mc.bio || "";

    $("#mcRima").value =
      mc.melhorRima || "";

    photoData =
      mc.foto || "";


    if (photoData) {

      $("#photoPreview").innerHTML =
        `
          <img
            src="${escapeHtml(photoData)}"
            alt=""
            style="
              width:100%;
              height:100%;
              object-fit:cover;
            "
          >
        `;

    }

  }


  updatePreview();

  $("#mcModal")?.classList.add("open");

  $("#mcModal")?.setAttribute(
    "aria-hidden",
    "false"
  );

}


/* =========================
   PREVIEW
   ========================= */

function updatePreview() {

  if ($("#previewName")) {

    $("#previewName").textContent =
      $("#mcNome")?.value ||
      "NOME DO MC";

  }


  if ($("#previewMeta")) {

    $("#previewMeta").textContent =

      `${$("#mcPontos")?.value || 0} pontos • ` +

      `${$("#mcTitulos")?.value || 0} títulos • ` +

      `${$("#mcTwolalas")?.value || 0} Twolalas`;

  }

}


/* =========================
   UPLOAD DA FOTO
   ========================= */

async function uploadPhoto(file) {

  if (!file) {
    return photoData || null;
  }


  if (!sb) {
    throw new Error(
      "Supabase não inicializado."
    );
  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      "A foto deve ter no máximo 5 MB."
    );

  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const fileName =
    `${crypto.randomUUID()}.${extension}`;


  /*
    Tentamos primeiro o bucket "mcs".
  */

  let upload =
    await sb.storage
      .from("mcs")
      .upload(
        fileName,
        file,
        {
          upsert: false
        }
      );


  /*
    Caso o bucket "mcs" não exista,
    tentamos "mc-photos".
  */

  if (upload.error) {

    upload =
      await sb.storage
        .from("mc-photos")
        .upload(
          fileName,
          file,
          {
            upsert: false
          }
        );

    if (upload.error) {

      throw new Error(
        "Não foi possível enviar a foto: " +
        upload.error.message
      );

    }


    const {
      data
    } =
      sb.storage
        .from("mc-photos")
        .getPublicUrl(fileName);


    return data.publicUrl;

  }


  const {
    data
  } =
    sb.storage
      .from("mcs")
      .getPublicUrl(fileName);


  return data.publicUrl;

}


/* =========================
   SALVAR MC
   ========================= */

async function saveMc(event) {

  event.preventDefault();


  if (!sb) {

    showMessage(
      "Supabase não inicializado.",
      "error"
    );

    return;

  }


  const nome =
    $("#mcNome")
      ?.value
      .trim();


  if (!nome) {

    showMessage(
      "Informe o nome artístico.",
      "error"
    );

    return;

  }


  const button =
    document.querySelector(
      '#mcForm button[type="submit"]'
    );


  if (button) {
    button.disabled = true;
    button.textContent =
      "SALVANDO...";
  }


  try {

    let foto =
      photoData || null;


    const file =
      $("#mcFoto")
        ?.files?.[0];


    if (file) {

      foto =
        await uploadPhoto(file);

    }


    /*
      Primeiro tentamos usar os nomes
      em português do painel.
    */

    const dadosPt = {

      nome: nome,

      instagram:
        $("#mcInstagram")
          ?.value
          .trim() || null,

      pix:
        $("#mcPix")
          ?.value
          .trim() || null,

      participacoes:
        Number(
          $("#mcParticipacoes")
            ?.value || 0
        ),

      titulos:
        Number(
          $("#mcTitulos")
            ?.value || 0
        ),

      derrotas:
        Number(
          $("#mcDerrotas")
            ?.value || 0
        ),

      twolalas:
        Number(
          $("#mcTwolalas")
            ?.value || 0
        ),

      pontos:
        Number(
          $("#mcPontos")
            ?.value || 0
        ),

      bio:
        $("#mcBio")
          ?.value
          .trim() || null,

      melhorRima:
        $("#mcRima")
          ?.value
          .trim() || null,

      foto:
        foto

    };


    let result;


    if (editingId) {

      result =
        await sb
          .from("mcs")
          .update(dadosPt)
          .eq(
            "id",
            editingId
          )
          .select();


    } else {

      result =
        await sb
          .from("mcs")
          .insert(dadosPt)
          .select();

    }


    /*
      Se a tabela usar nomes em inglês,
      fazemos uma segunda tentativa.
    */

    if (result.error) {

      console.warn(
        "Tentativa em português falhou:",
        result.error.message
      );


      const dadosEn = {

        name: nome,

        instagram:
          dadosPt.instagram,

        pix:
          dadosPt.pix,

        participations:
          dadosPt.participacoes,

        titles:
          dadosPt.titulos,

        losses:
          dadosPt.derrotas,

        two_lalas:
          dadosPt.twolalas,

        points:
          dadosPt.pontos,

        bio:
          dadosPt.bio,

        best_rhyme:
          dadosPt.melhorRima,

        photo_url:
          dadosPt.foto

      };


      if (editingId) {

        result =
          await sb
            .from("mcs")
            .update(dadosEn)
            .eq(
              "id",
              editingId
            )
            .select();

      } else {

        result =
          await sb
            .from("mcs")
            .insert(dadosEn)
            .select();

      }

    }


    if (result.error) {

      throw new Error(
        result.error.message
      );

    }


    $("#mcModal")
      ?.classList
      .remove("open");


    const wasEditing =
      Boolean(editingId);


    editingId = null;
    photoData = "";


    await loadMcs();


    showMessage(
      wasEditing
        ? "MC atualizado com sucesso!"
        : "MC cadastrado com sucesso!",
      "success"
    );


  } catch (error) {

    console.error(
      "Erro ao salvar MC:",
      error
    );


    showMessage(
      "Erro ao salvar MC: " +
      error.message,
      "error"
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "SALVAR MC";

    }

  }

}


/* =========================
   EXCLUIR MC
   ========================= */

async function deleteMc(id) {

  const original =
    mcs.find(
      mc =>
        String(mc.id) === String(id)
    );


  if (!original) return;


  const mc =
    normalizeMc(original);


  if (
    !confirm(
      `Excluir o cadastro de ${mc.nome}?`
    )
  ) {
    return;
  }


  try {

    /*
      Primeiro tenta excluir
      batalhas vinculadas.
    */

    try {

      await sb
        .from("battles")
        .delete()
        .or(
          `mc1_id.eq.${id},` +
          `mc2_id.eq.${id},` +
          `winner_id.eq.${id}`
        );

    } catch (e) {

      console.warn(
        "Não foi possível limpar batalhas:",
        e
      );

    }


    const {
      data,
      error
    } =
      await sb
        .from("mcs")
        .delete()
        .eq("id", id)
        .select("id");


    if (error) {

      throw new Error(
        error.message
      );

    }


    if (
      !data ||
      data.length === 0
    ) {

      throw new Error(
        "O MC não foi excluído. " +
        "Verifique as permissões DELETE no Supabase."
      );

    }


    await loadMcs();


    showMessage(
      "MC excluído com sucesso!",
      "success"
    );


  } catch (error) {

    console.error(error);

    showMessage(
      "Erro ao excluir MC: " +
      error.message,
      "error"
    );

  }

}


/* =========================
   EXPORTAR DADOS
   ========================= */

function exportData() {

  const data =
    mcs.map(normalizeMc);


  const blob =
    new Blob(
      [
        JSON.stringify(
          {
            version: 2,
            exportedAt:
              new Date()
                .toISOString(),
            mcs: data
          },
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const a =
    document.createElement("a");


  a.href = url;

  a.download =
    "batalha-alcateia-backup.json";


  document.body.appendChild(a);

  a.click();

  a.remove();


  URL.revokeObjectURL(url);


  showMessage(
    "Backup exportado!",
    "success"
  );

}


/* =========================
   IMPORTAR DADOS
   ========================= */

function importData(file) {

  if (!file) return;


  const reader =
    new FileReader();


  reader.onload =
    async () => {

      try {

        const data =
          JSON.parse(
            reader.result
          );


        if (
          !data ||
          !Array.isArray(data.mcs)
        ) {

          throw new Error(
            "Arquivo inválido."
          );

        }


        /*
          Importa cada MC para o banco.
        */

        for (
          const mc of data.mcs
        ) {

          const normalized =
            normalizeMc(mc);


          await sb
            .from("mcs")
            .insert({

              nome:
                normalized.nome,

              instagram:
                normalized.instagram,

              pix:
                normalized.pix,

              participacoes:
                normalized.participacoes,

              titulos:
                normalized.titulos,

              derrotas:
                normalized.derrotas,

              twolalas:
                normalized.twolalas,

              pontos:
                normalized.pontos,

              bio:
                normalized.bio,

              melhorRima:
                normalized.melhorRima,

              foto:
                normalized.foto

            });

        }


        await loadMcs();


        showMessage(
          "Dados importados!",
          "success"
        );


      } catch (error) {

        console.error(error);

        showMessage(
          "Erro ao importar: " +
          error.message,
          "error"
        );

      }

    };


  reader.readAsText(file);

}


/* =========================
   TROCAR DE TELA
   ========================= */

function switchView(view) {

  document
    .querySelectorAll(".view")
    .forEach(
      section =>
        section.classList
          .remove("active")
    );


  const target =
    $("#" + view + "View");


  if (target) {

    target.classList
      .add("active");

  }


  document
    .querySelectorAll(".side-link")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view === view
      );

    });


  $("#sidebar")
    ?.classList
    .remove("open");


  if (view === "dashboard") {
    renderDashboard();
  }

  if (view === "mcs") {
    renderMcs();
  }

  if (view === "ranking") {
    renderFullRanking();
  }

}


/* =========================
   CARREGAR TUDO
   ========================= */

async function loadAllData() {

  await loadMcs();

}


/* =========================
   EVENTOS DA PÁGINA
   ========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /*
      Inicializa Supabase.
    */

    const ok =
      initializeSupabase();


    if (!ok) {
      return;
    }


    /*
      Navegação lateral.
    */

    document
      .querySelectorAll(".side-link")
      .forEach(button => {

        button.onclick =
          () =>
            switchView(
              button.dataset.view
            );

      });


    /*
      Botões de nova MC.
    */

    $("#newMcButton")?.addEventListener(
      "click",
      () => openEditor()
    );


    $("#newMcFromDash")?.addEventListener(
      "click",
      () => {

        switchView("mcs");

        openEditor();

      }
    );


    $("#quickNewMc")?.addEventListener(
      "click",
      () => {

        switchView("mcs");

        openEditor();

      }
    );


    /*
      Exportar.
    */

    $("#quickExport")?.addEventListener(
      "click",
      exportData
    );


    /*
      Importar.
    */

    $("#quickImport")?.addEventListener(
      "click",
      () =>
        $("#importFile")?.click()
    );


    $("#importFile")?.addEventListener(
      "change",
      event => {

        const file =
          event.target.files?.[0];

        if (file) {
          importData(file);
        }

      }
    );


    /*
      Restaurar dados demo.
      IMPORTANTE:
      agora não apaga o banco.
      Apenas avisa que essa função
      ficará para uma etapa futura.
    */

    $("#quickReset")?.addEventListener(
      "click",
      () => {

        alert(
          "A restauração de dados demo " +
          "fica desativada nesta versão " +
          "para evitar apagar dados reais do banco."
        );

      }
    );


    /*
      Busca.
    */

    $("#searchInput")?.addEventListener(
      "input",
      renderMcs
    );


    /*
      Ordenação.
    */

    $("#sortSelect")?.addEventListener(
      "change",
      renderMcs
    );


    /*
      Fechar modal.
    */

    $("#closeModal")?.addEventListener(
      "click",
      () => {

        $("#mcModal")
          ?.classList
          .remove("open");

      }
    );


    $("#cancelForm")?.addEventListener(
      "click",
      () => {

        $("#mcModal")
          ?.classList
          .remove("open");

      }
    );


    $("#mcModal")?.addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "mcModal"
        ) {

          $("#mcModal")
            ?.classList
            .remove("open");

        }

      }
    );


    /*
      Menu mobile.
    */

    $("#menuButton")?.addEventListener(
      "click",
      () => {

        $("#sidebar")
          ?.classList
          .toggle("open");

      }
    );


    /*
      Atualização do preview.
    */

    [
      "mcNome",
      "mcPontos",
      "mcTitulos",
      "mcTwolalas"
    ]
      .forEach(id => {

        $("#" + id)?.addEventListener(
          "input",
          updatePreview
        );

      });


    /*
      Foto.
    */

    $("#mcFoto")?.addEventListener(
      "change",
      event => {

        const file =
          event.target.files?.[0];


        if (!file) return;


        if (
          file.size >
          5 * 1024 * 1024
        ) {

          showMessage(
            "A foto deve ter no máximo 5 MB.",
            "error"
          );

          event.target.value = "";

          return;
        }


        const reader =
          new FileReader();


        reader.onload =
          () => {

            photoData =
              reader.result;


            if ($("#photoPreview")) {

              $("#photoPreview").innerHTML =
                `
                  <img
                    src="${escapeHtml(photoData)}"
                    alt=""
                    style="
                      width:100%;
                      height:100%;
                      object-fit:cover;
                    "
                  >
                `;

            }

          };


        reader.readAsDataURL(file);

      }
    );


    /*
      Formulário.
    */

    $("#mcForm")?.addEventListener(
      "submit",
      saveMc
    );


    /*
      Verifica sessão existente.
    */

    await checkSession();

  }
);


/* =========================
   DISPONIBILIZAR FUNÇÕES
   ========================= */

window.login = login;
window.logout = logout;
window.openEditor = openEditor;
window.deleteMc = deleteMc;
window.switchView = switchView;
window.exportData = exportData;

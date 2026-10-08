/* =========================================================
   BATALHA DA ALCATÉIA
   PAINEL ADMINISTRATIVO
   Supabase + Cadastro de MCs
========================================================= */


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const SUPABASE_URL =
  "https://xrvefgqycejiuokdmfio.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_iCYF-r1R-VVcVHvlFJkxWg_R-urdYYA";


/* =========================================================
   CONEXÃO SUPABASE
========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   ELEMENTOS
========================================================= */

const loginScreen =
  document.getElementById("loginScreen");

const appContent =
  document.getElementById("appContent");

const loginForm =
  document.getElementById("loginForm");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const loginButton =
  document.getElementById("loginButton");

const loginError =
  document.getElementById("loginError");

const logoutButton =
  document.getElementById("logoutButton");

const userEmail =
  document.getElementById("userEmail");

const sidebar =
  document.getElementById("sidebar");

const menuButton =
  document.getElementById("menuButton");

const mcModal =
  document.getElementById("mcModal");

const mcForm =
  document.getElementById("mcForm");

const closeModal =
  document.getElementById("closeModal");

const cancelForm =
  document.getElementById("cancelForm");

const newMcButton =
  document.getElementById("newMcButton");

const newMcFromDash =
  document.getElementById("newMcFromDash");

const quickNewMc =
  document.getElementById("quickNewMc");

const mcAdminList =
  document.getElementById("mcAdminList");

const emptyState =
  document.getElementById("emptyState");

const searchInput =
  document.getElementById("searchInput");

const sortSelect =
  document.getElementById("sortSelect");

const mcId =
  document.getElementById("mcId");

const mcNome =
  document.getElementById("mcNome");

const mcInstagram =
  document.getElementById("mcInstagram");

const mcPix =
  document.getElementById("mcPix");

const mcParticipacoes =
  document.getElementById("mcParticipacoes");

const mcTitulos =
  document.getElementById("mcTitulos");

const mcDerrotas =
  document.getElementById("mcDerrotas");

const mcTwolalas =
  document.getElementById("mcTwolalas");

const mcPontos =
  document.getElementById("mcPontos");

const mcBio =
  document.getElementById("mcBio");

const mcRima =
  document.getElementById("mcRima");

const mcFoto =
  document.getElementById("mcFoto");

const photoPreview =
  document.getElementById("photoPreview");

const previewName =
  document.getElementById("previewName");

const previewMeta =
  document.getElementById("previewMeta");

const modalTitle =
  document.getElementById("modalTitle");

const modalEyebrow =
  document.getElementById("modalEyebrow");

const toast =
  document.getElementById("toast");


/* =========================================================
   ESTADO
========================================================= */

let mcs = [];

let editingMc = null;

let currentPhotoUrl = "";


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  iniciar
);


async function iniciar() {

  configurarEventos();

  await verificarSessao();

}


/* =========================================================
   VERIFICAR LOGIN
========================================================= */

async function verificarSessao() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .auth
        .getSession();

    if (error) {

      console.error(error);

      mostrarLogin();

      return;

    }

    const session =
      data.session;

    if (!session) {

      mostrarLogin();

      return;

    }

    const autorizado =
      await verificarAdministrador(
        session.user.id
      );

    if (!autorizado) {

      await supabaseClient
        .auth
        .signOut();

      mostrarLogin();

      mostrarErroLogin(
        "Este usuário não possui acesso ao painel."
      );

      return;

    }

    mostrarAplicacao(
      session.user
    );

  } catch (erro) {

    console.error(erro);

    mostrarLogin();

  }

}


/* =========================================================
   VERIFICAR ADMINISTRADOR
========================================================= */

async function verificarAdministrador(
  userId
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {

      console.error(
        "Erro ao verificar administrador:",
        error
      );

      return false;

    }

    return !!data;

  } catch (erro) {

    console.error(erro);

    return false;

  }

}


/* =========================================================
   MOSTRAR LOGIN
========================================================= */

function mostrarLogin() {

  loginScreen.style.display =
    "flex";

  appContent.style.display =
    "none";

}


/* =========================================================
   MOSTRAR APLICAÇÃO
========================================================= */

async function mostrarAplicacao(
  user
) {

  loginScreen.style.display =
    "none";

  appContent.style.display =
    "block";

  if (userEmail) {

    userEmail.textContent =
      user.email || "";

  }

  await carregarMCs();

}


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    limparErroLogin();

    const email =
      loginEmail.value.trim();

    const password =
      loginPassword.value;

    if (!email || !password) {

      mostrarErroLogin(
        "Digite seu e-mail e sua senha."
      );

      return;

    }

    loginButton.disabled =
      true;

    loginButton.textContent =
      "ENTRANDO...";

    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {

        throw error;

      }

      if (!data.user) {

        throw new Error(
          "Não foi possível identificar o usuário."
        );

      }

      const autorizado =
        await verificarAdministrador(
          data.user.id
        );

      if (!autorizado) {

        await supabaseClient
          .auth
          .signOut();

        throw new Error(
          "Este usuário não está autorizado como administrador."
        );

      }

      mostrarAplicacao(
        data.user
      );

    } catch (erro) {

      console.error(erro);

      mostrarErroLogin(
        traduzirErroLogin(
          erro.message
        )
      );

    } finally {

      loginButton.disabled =
        false;

      loginButton.textContent =
        "ENTRAR NO PAINEL";

    }

  }
);


/* =========================================================
   TRADUZIR ERROS
========================================================= */

function traduzirErroLogin(
  mensagem
) {

  const texto =
    String(mensagem || "");

  if (
    texto.toLowerCase()
      .includes("invalid login credentials")
  ) {

    return "E-mail ou senha incorretos.";

  }

  if (
    texto.toLowerCase()
      .includes("email not confirmed")
  ) {

    return "Seu e-mail ainda não foi confirmado.";

  }

  return texto ||
    "Não foi possível entrar.";

}


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
  "click",
  async function() {

    await supabaseClient
      .auth
      .signOut();

    mcs = [];

    appContent.style.display =
      "none";

    loginScreen.style.display =
      "flex";

    loginPassword.value = "";

    loginEmail.focus();

  }
);


/* =========================================================
   ERROS LOGIN
========================================================= */

function mostrarErroLogin(
  mensagem
) {

  loginError.textContent =
    mensagem;

}

function limparErroLogin() {

  loginError.textContent =
    "";

}


/* =========================================================
   MENU
========================================================= */

if (menuButton) {

  menuButton.addEventListener(
    "click",
    function() {

      sidebar.classList.toggle(
        "open"
      );

    }
  );

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
  .querySelectorAll(".side-link")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        function() {

          abrirView(
            button.dataset.view
          );

          if (sidebar) {

            sidebar.classList.remove(
              "open"
            );

          }

        }
      );

    }
  );


document
  .querySelectorAll("[data-view-link]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        function() {

          abrirView(
            button.dataset.viewLink
          );

        }
      );

    }
  );


function abrirView(
  nome
) {

  document
    .querySelectorAll(".view")
    .forEach(
      view => {

        view.classList.remove(
          "active"
        );

      }
    );

  document
    .querySelectorAll(".side-link")
    .forEach(
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  const view =
    document.getElementById(
      nome + "View"
    );

  if (view) {

    view.classList.add(
      "active"
    );

  }


  const menu =
    document.querySelector(
      `.side-link[data-view="${nome}"]`
    );

  if (menu) {

    menu.classList.add(
      "active"
    );

  }


  if (nome === "ranking") {

    renderizarRanking();

  }

}


/* =========================================================
   CARREGAR MCs DO SUPABASE
========================================================= */

async function carregarMCs() {

  mcAdminList.innerHTML =
    `<div class="empty">
       <div>⏳</div>
       <h2>CARREGANDO MCs...</h2>
     </div>`;

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("mcs")
        .select("*")
        .order(
          "pontos",
          {
            ascending: false
          }
        );

    if (error) {

      throw error;

    }

    mcs =
      Array.isArray(data)
        ? data
        : [];

    renderizarMCs();

    atualizarDashboard();

    renderizarRanking();

  } catch (erro) {

    console.error(
      "Erro ao carregar MCs:",
      erro
    );

    mcAdminList.innerHTML =
      `<div class="empty">
         <div>⚠️</div>
         <h2>ERRO AO CARREGAR</h2>
         <p>${escaparHtml(
           erro.message
         )}</p>
       </div>`;

  }

}


/* =========================================================
   RENDERIZAR MCs
========================================================= */

function renderizarMCs() {

  let lista =
    [...mcs];

  const busca =
    String(
      searchInput.value || ""
    )
      .trim()
      .toLowerCase();


  if (busca) {

    lista =
      lista.filter(
        mc => {

          const nome =
            String(
              mc.nome || ""
            )
              .toLowerCase();

          const instagram =
            String(
              mc.instagram || ""
            )
              .toLowerCase();

          return (
            nome.includes(busca) ||
            instagram.includes(busca)
          );

        }
      );

  }


  lista =
    ordenarMCs(
      lista,
      sortSelect.value
    );


  if (!lista.length) {

    mcAdminList.innerHTML =
      "";

    emptyState.hidden =
      false;

    return;

  }

  emptyState.hidden =
    true;


  mcAdminList.innerHTML =
    lista
      .map(
        mc => criarCardMC(mc)
      )
      .join("");


  adicionarEventosCards();

}


/* =========================================================
   ORDENAR MCs
========================================================= */

function ordenarMCs(
  lista,
  tipo
) {

  return lista.sort(
    (a, b) => {

      if (tipo === "nome") {

        return String(
          a.nome || ""
        ).localeCompare(
          String(
            b.nome || ""
          ),
          "pt-BR"
        );

      }

      if (tipo === "titulos") {

        return Number(
          b.titulos || 0
        ) -
        Number(
          a.titulos || 0
        );

      }

      if (tipo === "twolalas") {

        return Number(
          b.twolalas || 0
        ) -
        Number(
          a.twolalas || 0
        );

      }

      if (
        tipo ===
        "participacoes"
      ) {

        return Number(
          b.participacoes || 0
        ) -
        Number(
          a.participacoes || 0
        );

      }

      return Number(
        b.pontos || 0
      ) -
      Number(
        a.pontos || 0
      );

    }
  );

}


/* =========================================================
   CARD DO MC
========================================================= */

function criarCardMC(
  mc
) {

  const foto =
    mc.foto_url ||
    "";

  const fotoHtml =
    foto
      ? `<img
           src="${escaparAtributo(foto)}"
           alt="${escaparAtributo(
             mc.nome || "MC"
           )}"
           style="
             width:100%;
             height:100%;
             object-fit:cover;
           "
         >`
      : "FOTO";


  const instagram =
    mc.instagram
      ? escaparHtml(
          mc.instagram
        )
      : "Sem Instagram";


  return `

    <article
      class="mc-row"
      data-id="${escaparAtributo(
        mc.id
      )}">

      <div class="mc-avatar">

        ${fotoHtml}

      </div>


      <div>

        <h3>
          ${escaparHtml(
            mc.nome || "Sem nome"
          )}
        </h3>

        <p>
          ${instagram}
        </p>


        <div class="mc-stats">

          <span>
            ${numero(mc.pontos)}
            PTS
          </span>

          <span>
            ${numero(mc.participacoes)}
            PART.
          </span>

          <span>
            ${numero(mc.titulos)}
            TÍTULOS
          </span>

          <span>
            ${numero(mc.derrotas)}
            DERROTAS
          </span>

          <span>
            ${numero(mc.twolalas)}
            TWO LALAS
          </span>

        </div>

      </div>


      <div class="row-actions">

        <button
          class="icon-btn edit-mc"
          data-id="${escaparAtributo(
            mc.id
          )}">

          EDITAR

        </button>


        <button
          class="icon-btn delete delete-mc"
          data-id="${escaparAtributo(
            mc.id
          )}">

          EXCLUIR

        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   EVENTOS DOS CARDS
========================================================= */

function adicionarEventosCards() {

  document
    .querySelectorAll(".edit-mc")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function() {

            abrirEdicaoMC(
              button.dataset.id
            );

          }
        );

      }
    );


  document
    .querySelectorAll(".delete-mc")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async function() {

            await excluirMC(
              button.dataset.id
            );

          }
        );

      }
    );

}


/* =========================================================
   NOVO MC
========================================================= */

newMcButton.addEventListener(
  "click",
  abrirNovoMC
);

newMcFromDash.addEventListener(
  "click",
  abrirNovoMC
);

quickNewMc.addEventListener(
  "click",
  abrirNovoMC
);


function abrirNovoMC() {

  editingMc =
    null;

  currentPhotoUrl =
    "";

  mcForm.reset();

  mcId.value =
    "";

  mcParticipacoes.value =
    0;

  mcTitulos.value =
    0;

  mcDerrotas.value =
    0;

  mcTwolalas.value =
    0;

  mcPontos.value =
    0;

  modalTitle.textContent =
    "NOVO MC";

  modalEyebrow.textContent =
    "CADASTRO";

  photoPreview.innerHTML =
    "FOTO<br>DO MC";

  atualizarPreview();

  abrirModal();

}


/* =========================================================
   EDITAR MC
========================================================= */

function abrirEdicaoMC(
  id
) {

  const mc =
    mcs.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!mc) {

    mostrarToast(
      "MC não encontrado."
    );

    return;

  }

  editingMc =
    mc;

  currentPhotoUrl =
    mc.foto_url || "";


  mcId.value =
    mc.id || "";

  mcNome.value =
    mc.nome || "";

  mcInstagram.value =
    mc.instagram || "";

  mcPix.value =
    mc.pix || "";

  mcParticipacoes.value =
    numero(mc.participacoes);

  mcTitulos.value =
    numero(mc.titulos);

  mcDerrotas.value =
    numero(mc.derrotas);

  mcTwolalas.value =
    numero(mc.twolalas);

  mcPontos.value =
    numero(mc.pontos);

  mcBio.value =
    mc.bio || "";

  mcRima.value =
    mc.melhor_rima || "";

  mcFoto.value =
    "";


  modalTitle.textContent =
    "EDITAR MC";

  modalEyebrow.textContent =
    "EDIÇÃO";


  if (currentPhotoUrl) {

    photoPreview.innerHTML =
      `<img
        src="${escaparAtributo(
          currentPhotoUrl
        )}"
        alt="Foto"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
        "
      >`;

  } else {

    photoPreview.innerHTML =
      "FOTO<br>DO MC";

  }


  atualizarPreview();

  abrirModal();

}


/* =========================================================
   ABRIR / FECHAR MODAL
========================================================= */

function abrirModal() {

  mcModal.classList.add(
    "open"
  );

  mcModal.setAttribute(
    "aria-hidden",
    "false"
  );

  setTimeout(
    () => mcNome.focus(),
    100
  );

}


function fecharModal() {

  mcModal.classList.remove(
    "open"
  );

  mcModal.setAttribute(
    "aria-hidden",
    "true"
  );

  editingMc =
    null;

}


closeModal.addEventListener(
  "click",
  fecharModal
);

cancelForm.addEventListener(
  "click",
  fecharModal
);


mcModal.addEventListener(
  "click",
  function(event) {

    if (
      event.target ===
      mcModal
    ) {

      fecharModal();

    }

  }
);


/* =========================================================
   PREVIEW
========================================================= */

[
  mcNome,
  mcPontos,
  mcTitulos,
  mcTwolalas
]
  .forEach(
    campo => {

      campo.addEventListener(
        "input",
        atualizarPreview
      );

    }
  );


function atualizarPreview() {

  previewName.textContent =
    mcNome.value.trim() ||
    "NOME DO MC";


  previewMeta.textContent =
    `${numero(mcPontos.value)} pontos • ` +
    `${numero(mcTitulos.value)} títulos • ` +
    `${numero(mcTwolalas.value)} Twolalas`;

}


/* =========================================================
   PREVIEW FOTO
========================================================= */

mcFoto.addEventListener(
  "change",
  function() {

    const arquivo =
      mcFoto.files[0];

    if (!arquivo) {

      return;

    }


    if (
      arquivo.size >
      2 * 1024 * 1024
    ) {

      mostrarToast(
        "A foto deve ter no máximo 2 MB."
      );

      mcFoto.value =
        "";

      return;

    }


    const reader =
      new FileReader();


    reader.onload =
      function(event) {

        photoPreview.innerHTML =
          `<img
            src="${event.target.result}"
            alt="Prévia"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
            "
          >`;

      };


    reader.readAsDataURL(
      arquivo
    );

  }
);


/* =========================================================
   SALVAR MC
========================================================= */

mcForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const nome =
      mcNome.value.trim();


    if (!nome) {

      mostrarToast(
        "Digite o nome do MC."
      );

      return;

    }


    const dados = {

      nome,

      instagram:
        mcInstagram.value.trim(),

      pix:
        mcPix.value.trim(),

      participacoes:
        inteiro(
          mcParticipacoes.value
        ),

      titulos:
        inteiro(
          mcTitulos.value
        ),

      derrotas:
        inteiro(
          mcDerrotas.value
        ),

      twolalas:
        inteiro(
          mcTwolalas.value
        ),

      pontos:
        inteiro(
          mcPontos.value
        ),

      bio:
        mcBio.value.trim(),

      melhor_rima:
        mcRima.value.trim()

    };


    const submitButton =
      mcForm.querySelector(
        'button[type="submit"]'
      );


    submitButton.disabled =
      true;

    submitButton.textContent =
      "SALVANDO...";


    try {

      /* -----------------------------------------------
         FOTO
      ------------------------------------------------ */

      if (
        mcFoto.files &&
        mcFoto.files[0]
      ) {

        currentPhotoUrl =
          await enviarFoto(
            mcFoto.files[0],
            nome
          );

        dados.foto_url =
          currentPhotoUrl;

      } else if (
        currentPhotoUrl
      ) {

        dados.foto_url =
          currentPhotoUrl;

      }


      /* -----------------------------------------------
         ATUALIZAR
      ------------------------------------------------ */

      if (editingMc) {

        const {
          error
        } =
          await supabaseClient
            .from("mcs")
            .update(dados)
            .eq(
              "id",
              editingMc.id
            );

        if (error) {

          throw error;

        }


        mostrarToast(
          "MC atualizado com sucesso!"
        );

      }


      /* -----------------------------------------------
         CRIAR
      ------------------------------------------------ */

      else {

        const {
          error
        } =
          await supabaseClient
            .from("mcs")
            .insert(
              dados
            );

        if (error) {

          throw error;

        }


        mostrarToast(
          "MC cadastrado com sucesso!"
        );

      }


      fecharModal();

      await carregarMCs();


    } catch (erro) {

      console.error(
        "Erro ao salvar MC:",
        erro
      );


      mostrarToast(
        "Erro: " +
        (erro.message ||
          "não foi possível salvar.")
      );


    } finally {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "SALVAR MC";

    }

  }
);


/* =========================================================
   ENVIAR FOTO PARA STORAGE
========================================================= */

async function enviarFoto(
  arquivo,
  nome
) {

  const extensao =
    obterExtensao(
      arquivo.name
    );


  const nomeSeguro =
    normalizarNomeArquivo(
      nome
    );


  const nomeArquivo =
    `${nomeSeguro}-${Date.now()}.${extensao}`;


  const caminho =
    `mcs/${nomeArquivo}`;


  const {
    error
  } =
    await supabaseClient
      .storage
      .from("mcs")
      .upload(
        caminho,
        arquivo,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            arquivo.type
        }
      );


  if (error) {

    throw new Error(
      "Não foi possível enviar a foto. " +
      "Verifique se o Storage 'mcs' foi criado no Supabase. " +
      error.message
    );

  }


  const {
    data
  } =
    supabaseClient
      .storage
      .from("mcs")
      .getPublicUrl(
        caminho
      );


  return data.publicUrl;

}


/* =========================================================
   EXCLUIR MC
========================================================= */

async function excluirMC(
  id
) {

  const mc =
    mcs.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!mc) {

    return;

  }


  const confirmar =
    confirm(
      `Tem certeza que deseja excluir o MC "${mc.nome}"?`
    );


  if (!confirmar) {

    return;

  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("mcs")
        .delete()
        .eq(
          "id",
          id
        );


    if (error) {

      throw error;

    }


    mostrarToast(
      "MC excluído com sucesso."
    );


    await carregarMCs();


  } catch (erro) {

    console.error(
      erro
    );


    mostrarToast(
      "Erro ao excluir MC: " +
      erro.message
    );

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function atualizarDashboard() {

  const totalMCs =
    mcs.length;


  const totalPontos =
    mcs.reduce(
      (
        total,
        mc
      ) =>
        total +
        numero(mc.pontos),
      0
    );


  const totalTitulos =
    mcs.reduce(
      (
        total,
        mc
      ) =>
        total +
        numero(mc.titulos),
      0
    );


  const totalTwolalas =
    mcs.reduce(
      (
        total,
        mc
      ) =>
        total +
        numero(mc.twolalas),
      0
    );


  document.getElementById(
    "metricMcs"
  ).textContent =
    totalMCs;


  document.getElementById(
    "metricPoints"
  ).textContent =
    totalPontos;


  document.getElementById(
    "metricTitles"
  ).textContent =
    totalTitulos;


  document.getElementById(
    "metricTwolalas"
  ).textContent =
    totalTwolalas;


  renderizarMiniRanking();

}


/* =========================================================
   MINI RANKING
========================================================= */

function renderizarMiniRanking() {

  const elemento =
    document.getElementById(
      "dashRanking"
    );


  const ranking =
    [...mcs]
      .sort(
        (
          a,
          b
        ) =>
          numero(b.pontos) -
          numero(a.pontos)
      )
      .slice(
        0,
        8
      );


  if (!ranking.length) {

    elemento.innerHTML =
      `<div class="empty">
         Nenhum MC cadastrado.
       </div>`;

    return;

  }


  elemento.innerHTML =
    ranking
      .map(
        (
          mc,
          index
        ) => `

          <div class="mini-rank">

            <span>
              #${index + 1}
            </span>

            <strong>
              ${escaparHtml(
                mc.nome || ""
              )}
            </strong>

            <span>
              ${numero(
                mc.pontos
              )} pts
            </span>

          </div>

        `
      )
      .join("");

}


/* =========================================================
   RANKING COMPLETO
========================================================= */

function renderizarRanking() {

  const elemento =
    document.getElementById(
      "fullRanking"
    );


  const ranking =
    [...mcs]
      .sort(
        (
          a,
          b
        ) =>
          numero(b.pontos) -
          numero(a.pontos)
      );


  if (!ranking.length) {

    elemento.innerHTML =
      `<div class="empty">
         Nenhum MC cadastrado.
       </div>`;

    return;

  }


  elemento.innerHTML =
    ranking
      .map(
        (
          mc,
          index
        ) => {

          const participacoes =
            numero(
              mc.participacoes
            );


          const pontos =
            numero(
              mc.pontos
            );


          const desempenho =
            participacoes > 0
              ? Math.round(
                  (
                    pontos /
                    participacoes
                  ) * 10
                ) / 10
              : 0;


          return `

            <div class="full-rank">

              <div class="position">

                #${index + 1}

              </div>


              <div>

                <strong>
                  ${escaparHtml(
                    mc.nome || ""
                  )}
                </strong>

                <small>
                  ${escaparHtml(
                    mc.instagram || ""
                  )}
                </small>

              </div>


              <div>

                <strong>
                  ${pontos}
                </strong>

                <small>
                  PONTOS
                </small>

              </div>


              <div>

                <strong>
                  ${numero(
                    mc.titulos
                  )}
                </strong>

                <small>
                  TÍTULOS
                </small>

              </div>


              <div>

                <strong>
                  ${numero(
                    mc.participacoes
                  )}
                </strong>

                <small>
                  PARTIC.
                </small>

              </div>


              <div>

                <strong>
                  ${desempenho}
                </strong>

                <small>
                  PTS/PART.
                </small>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================================================
   PESQUISA
========================================================= */

searchInput.addEventListener(
  "input",
  renderizarMCs
);


sortSelect.addEventListener(
  "change",
  renderizarMCs
);


/* =========================================================
   EXPORTAR DADOS
========================================================= */

const quickExport =
  document.getElementById(
    "quickExport"
  );


quickExport.addEventListener(
  "click",
  exportarDados
);


function exportarDados() {

  const dados =
    JSON.stringify(
      mcs,
      null,
      2
    );


  const blob =
    new Blob(
      [dados],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    "batalha-da-alcateia-mcs.json";


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );


  mostrarToast(
    "Dados exportados."
  );

}


/* =========================================================
   IMPORTAR DADOS
========================================================= */

const quickImport =
  document.getElementById(
    "quickImport"
  );

const importFile =
  document.getElementById(
    "importFile"
  );


quickImport.addEventListener(
  "click",
  function() {

    importFile.click();

  }
);


importFile.addEventListener(
  "change",
  async function() {

    const arquivo =
      importFile.files[0];

    if (!arquivo) {

      return;

    }


    try {

      const texto =
        await arquivo.text();


      const dados =
        JSON.parse(
          texto
        );


      if (
        !Array.isArray(
          dados
        )
      ) {

        throw new Error(
          "Arquivo inválido."
        );

      }


      const confirmar =
        confirm(
          `Foram encontrados ${dados.length} MC(s). Deseja importar esses dados para o banco online?`
        );


      if (!confirmar) {

        importFile.value =
          "";

        return;

      }


      for (
        const mc of dados
      ) {

        const registro = {

          nome:
            mc.nome || "MC",

          instagram:
            mc.instagram || "",

          pix:
            mc.pix || "",

          participacoes:
            inteiro(
              mc.participacoes
            ),

          titulos:
            inteiro(
              mc.titulos
            ),

          derrotas:
            inteiro(
              mc.derrotas
            ),

          twolalas:
            inteiro(
              mc.twolalas
            ),

          pontos:
            inteiro(
              mc.pontos
            ),

          bio:
            mc.bio || "",

          melhor_rima:
            mc.melhor_rima || "",

          foto_url:
            mc.foto_url || null

        };


        const {
          error
        } =
          await supabaseClient
            .from("mcs")
            .insert(
              registro
            );


        if (error) {

          throw error;

        }

      }


      mostrarToast(
        "Importação concluída!"
      );


      await carregarMCs();


    } catch (erro) {

      console.error(
        erro
      );


      mostrarToast(
        "Erro na importação: " +
        erro.message
      );

    }


    importFile.value =
      "";

  }
);


/* =========================================================
   TECLADO
========================================================= */

document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key ===
      "Escape"
    ) {

      if (
        mcModal.classList.contains(
          "open"
        )
      ) {

        fecharModal();

      }

    }

  }
);


/* =========================================================
   UTILITÁRIOS
========================================================= */

function numero(
  valor
) {

  const n =
    Number(valor);

  return Number.isFinite(n)
    ? n
    : 0;

}


function inteiro(
  valor
) {

  const n =
    parseInt(
      valor,
      10
    );

  return Number.isFinite(n)
    ? n
    : 0;

}


function obterExtensao(
  nome
) {

  const partes =
    String(nome)
      .split(".");

  return (
    partes[
      partes.length - 1
    ] || "jpg"
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    ) || "jpg";

}


function normalizarNomeArquivo(
  nome
) {

  return String(nome)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase() ||
    "mc";

}


function escaparHtml(
  valor
) {

  return String(
    valor ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escaparAtributo(
  valor
) {

  return escaparHtml(
    valor
  );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function mostrarToast(
  mensagem
) {

  if (!toast) {

    return;

  }


  toast.textContent =
    mensagem;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      function() {

        toast.classList.remove(
          "show"
        );

      },
      3500
    );

}


/* =========================================================
   OBSERVAR ALTERAÇÕES DE LOGIN
========================================================= */

supabaseClient
  .auth
  .onAuthStateChange(
    async (
      event,
      session
    ) => {

      if (
        event ===
        "SIGNED_OUT"
      ) {

        mostrarLogin();

        return;

      }


      if (
        event ===
          "SIGNED_IN" &&
        session
      ) {

        const autorizado =
          await verificarAdministrador(
            session.user.id
          );


        if (
          autorizado
        ) {

          mostrarAplicacao(
            session.user
          );

        }

      }

    }
  );


/* =========================================================
   FIM
========================================================= */

console.log(
  "🐺 Batalha da Alcatéia — Painel carregado."
);

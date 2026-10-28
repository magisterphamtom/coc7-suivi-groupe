/**
 * CoC7 — Suivi du groupe (magisterphamtom)
 * Réunit dans une seule fenêtre à onglets les quatre suivis CoC7 :
 * Suivi de Chance, Suivi de Santé Mentale, Suivi des Bonds (Liens) et Suivi de Poursuites.
 * Chaque onglet est la fenêtre d'origine, avec toutes ses fonctions, et lit les données
 * aux mêmes endroits qu'avant (époques, liens, poursuite en cours) : rien n'est à ressaisir.
 */
import * as Chance from "./chance.js";
import * as Sante from "./sante.js";
import * as Liens from "./liens.js";
import * as Poursuite from "./poursuite.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const ID = "coc7-suivi-groupe";
const ANCIENS = ["coc7-luck-tracker", "coc7-san-tracker", "coc7-bonds-tracker", "coc7-chase-tracker"];

/**
 * Fenêtre d'origine affichée dans un onglet : sans cadre ni position propre, insérée dans
 * l'onglet. Fermer l'onglet ferme tout le Suivi du groupe.
 */
function embarquer(Base, onglet) {
  return class extends Base {
    static DEFAULT_OPTIONS = { classes: ["csg-embarque"], window: { frame: false, positioned: false } };
    _insertElement(element) {
      const zone = suivi?.element?.querySelector(`[data-csg-zone="${onglet}"]`);
      if (!zone) return super._insertElement(element);
      zone.replaceChildren(element);
    }
    async close(options = {}) {
      if (!options.csgFin && suivi?.rendered) return suivi.close();
      return super.close(options);
    }
  };
}

const ONGLETS = [
  { id: "chance", label: "CSG.chance", icon: "fa-solid fa-clover", app: () => Chance.embed(embarquer(Chance.App, "chance")) },
  { id: "san", label: "CSG.san", icon: "fa-solid fa-brain", app: () => Sante.embed(embarquer(Sante.App, "san")) },
  { id: "liens", label: "CSG.liens", icon: "fa-solid fa-link", app: () => Liens.embed(embarquer(Liens.App, "liens")) },
  { id: "poursuite", label: "CSG.poursuite", icon: "fa-solid fa-gauge-high", app: () => Poursuite.embed(embarquer(Poursuite.App, "poursuite")) }
];

class SuiviGroupe extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "csg-suivi",
    classes: ["csg-suivi"],
    tag: "div",
    window: { title: "CSG.titre", icon: "fa-solid fa-users-viewfinder", resizable: true },
    position: { width: 720, height: 720 },
    actions: { csgOnglet: SuiviGroupe.#onOnglet }
  };

  static PARTS = { corps: { template: `modules/${ID}/templates/suivi.hbs` } };

  onglet = "chance";

  async _prepareContext() {
    return { onglets: ONGLETS.map((o) => ({ ...o, actif: o.id === this.onglet })) };
  }

  async _onRender(context, options) {
    super._onRender(context, options);
    await this.montrer(this.onglet);
  }

  /** Affiche un onglet ; sa fenêtre est créée au premier affichage puis gardée. */
  async montrer(id) {
    this.onglet = ONGLETS.some((o) => o.id === id) ? id : "chance";
    const el = this.element;
    el.querySelectorAll("[data-csg-zone]").forEach((z) => z.classList.toggle("actif", z.dataset.csgZone === this.onglet));
    el.querySelectorAll(".csg-onglets a").forEach((a) => a.classList.toggle("actif", a.dataset.onglet === this.onglet));
    const app = ONGLETS.find((o) => o.id === this.onglet).app();
    if (!app.rendered) await app.render({ force: true });
    else if (!el.querySelector(`[data-csg-zone="${this.onglet}"]`).contains(app.element)) {
      el.querySelector(`[data-csg-zone="${this.onglet}"]`).replaceChildren(app.element);
    }
  }

  static #onOnglet(event, target) { return this.montrer(target.dataset.onglet); }

  async close(options = {}) {
    for (const o of ONGLETS) {
      const app = o.app();
      if (app.rendered) await app.close({ csgFin: true, animate: false });
    }
    return super.close(options);
  }
}

let suivi = null;

/** Ouvre le Suivi du groupe sur un onglet (chance, san, liens, poursuite). */
export async function ouvrir(onglet = "chance") {
  if (!game.user.isGM) return ui.notifications.warn("Le suivi du groupe est réservé au Gardien.");
  if (suivi?.rendered) { await suivi.montrer(onglet); suivi.bringToFront(); return suivi; }
  suivi = new SuiviGroupe();
  suivi.onglet = onglet;
  return suivi.render({ force: true });
}

function basculer() {
  if (suivi?.rendered) return suivi.close();
  return ouvrir(suivi?.onglet ?? "chance");
}

Hooks.on("getSceneControlButtons", (controls) => {
  const jetons = controls.tokens;
  if (!jetons?.tools) return;
  jetons.tools.csgSuivi = {
    name: "csgSuivi",
    title: "CSG.bouton",
    icon: "fa-solid fa-users-viewfinder",
    order: Object.keys(jetons.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => basculer()
  };
});

Hooks.once("ready", () => {
  game.modules.get(ID).api = { ouvrir, basculer, jauge: () => Poursuite.toggleChaseGauge() };
  const actifs = ANCIENS.filter((m) => game.modules.get(m)?.active);
  if (game.user.isGM && actifs.length) {
    ui.notifications.warn(game.i18n.format("CSG.anciens", { liste: actifs.map((m) => game.modules.get(m).title).join(", ") }), { permanent: true });
  }
});

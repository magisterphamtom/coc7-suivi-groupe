/**
 * Lecture / écriture des données aux emplacements d'origine des anciens modules
 * (coc7-luck-tracker, coc7-bonds-tracker…), même s'ils sont désactivés ou désinstallés :
 * getFlag/setFlag refusent un module absent, on passe donc par les chemins « flags.<module>.<clé> ».
 */
export const getF = (doc, scope, key) => foundry.utils.getProperty(doc?.flags ?? {}, `${scope}.${key}`);
export const setF = (doc, scope, key, value) => doc.update({ [`flags.${scope}.${key}`]: value });
export const unsetF = (doc, scope, key) => doc.update({ [`flags.${scope}.-=${key}`]: null });

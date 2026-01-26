import React from "react";
import { useTranslation } from "react-i18next";

/**
 * useTr(prefix?)
 * - tr("title", "Fallback")                      -> t("title", { defaultValue: "Fallback" })
 * - tr("hello", "Hello {{name}}", { name: "X" }) -> interpolation
 * - tr("welcome_name", { name: "Institute" })    -> ✅ supported (vars-only call)
 */
export function useTr(prefix) {
  const { t, i18n } = useTranslation();

  const tr = React.useCallback(
    (key, def, vars) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // ✅ Backward compatible:
      // If second arg is an object and vars is missing, treat it as vars (not defaultValue)
      const defIsVars =
        def && typeof def === "object" && !Array.isArray(def) && vars === undefined;

      const realVars = defIsVars ? def : vars;
      const realDef = defIsVars ? undefined : def;

      return t(fullKey, { defaultValue: realDef, ...(realVars || {}) });
    },
    [t, prefix]
  );

  return { tr, t, i18n };
}

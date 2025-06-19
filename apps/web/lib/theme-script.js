// Script pour éviter le scintillement du thème au chargement
(function () {
  function getThemePreference() {
    if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme");
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function setTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      // theme === 'system'
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(systemTheme);
      document.documentElement.setAttribute("data-theme", systemTheme);
    }
  }

  const theme = getThemePreference();
  setTheme(theme);
})();

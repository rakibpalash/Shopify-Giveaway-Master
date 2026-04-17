(function () {
  "use strict";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function initWidget(widget) {
    const giveawayId = widget.dataset.giveawayId;
    const appUrl = widget.dataset.appUrl;

    if (!giveawayId || !appUrl) return;

    const form = widget.querySelector(".giveaway-widget__form");
    const successEl = widget.querySelector(".giveaway-widget__success");
    const messageEl = widget.querySelector(".giveaway-widget__message");
    const submitBtn = widget.querySelector(".giveaway-widget__submit");

    if (!form) return;

    function showFieldError(input, msg) {
      const errorEl = input.closest(".giveaway-widget__field")
        ?.querySelector(".giveaway-widget__field-error");
      input.setAttribute("aria-invalid", "true");
      if (errorEl) errorEl.textContent = msg;
    }

    function clearFieldError(input) {
      const errorEl = input.closest(".giveaway-widget__field")
        ?.querySelector(".giveaway-widget__field-error");
      input.removeAttribute("aria-invalid");
      if (errorEl) errorEl.textContent = "";
    }

    function showMessage(msg, isError) {
      messageEl.textContent = msg;
      messageEl.className = "giveaway-widget__message" +
        (isError ? " giveaway-widget__message--error" : " giveaway-widget__message--info");
      messageEl.hidden = false;
    }

    function setLoading(loading) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading
        ? (submitBtn.dataset.loadingText || "Entering...")
        : (submitBtn.dataset.originalText || "Enter Giveaway");
    }

    submitBtn.dataset.originalText = submitBtn.textContent;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const nameInput = form.querySelector('[name="customerName"]');
      const emailInput = form.querySelector('[name="customerEmail"]');
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();

      let valid = true;
      clearFieldError(nameInput);
      clearFieldError(emailInput);
      messageEl.hidden = true;

      if (!name || name.length < 2) {
        showFieldError(nameInput, "Please enter your full name.");
        valid = false;
      }
      if (!EMAIL_RE.test(email)) {
        showFieldError(emailInput, "Please enter a valid email address.");
        valid = false;
      }

      if (!valid) return;

      setLoading(true);

      try {
        const res = await fetch(appUrl + "/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            giveawayId,
            customerName: name,
            customerEmail: email,
            entryMethod: "widget",
          }),
        });

        const data = await res.json();

        if (data.success) {
          form.hidden = true;
          successEl.hidden = false;
        } else {
          showMessage(data.error || "Something went wrong. Please try again.", true);
          setLoading(false);
        }
      } catch (_) {
        showMessage("Network error. Please check your connection and try again.", true);
        setLoading(false);
      }
    });
  }

  document.querySelectorAll(".giveaway-widget").forEach(initWidget);
})();

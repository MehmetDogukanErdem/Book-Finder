(function () {
  function showAlert(message, type = "info", timeout = 3000) {
    try {
      const id = "site-alerts";
      let $container = $("#" + id);
      if (!$container.length) {
        $container = $("<div>").attr("id", id).addClass("alerts-container");
        $("body").append($container);
      }

      const $el = $("<div>").addClass(`alert alert-${type}`);
      const $msgWrap = $("<div>").addClass("alert-message");

      let $icon = null;
      switch (type) {
        case "success":
          $icon = $("<i>")
            .addClass("fa-regular fa-circle-check")
            .css("color", "#12c009ff");
          break;
        case "info":
          $icon = $("<i>")
            .addClass("fa-solid fa-circle-info")
            .css("color", "#0386e9ff");
          break;
        case "fail":
        case "error":
        case "danger":
          $icon = $("<i>")
            .addClass("fa-solid fa-triangle-exclamation")
            .css("color", "#ed0c0c");
          break;
      }
      if ($icon) $msgWrap.append($icon);

      const $msgText = $("<span>").text(message);
      $msgWrap.append($msgText);
      $el.append($msgWrap);

      const $close = $("<span>")
        .addClass("closebtn")
        .attr("role", "button")
        .html("&times;");
      $close.on("click", function () {
        $el.remove();
      });
      $el.append($close);

      $container.append($el);

      setTimeout(function () {
        $el.addClass("show");
      }, 10);

      const t = setTimeout(function () {
        $el.removeClass("show");
        setTimeout(function () {
          $el.remove();
        }, 180);
      }, timeout);
      return $el[0];
    } catch (e) {
      try {
        window.alert(message);
      } catch (er) {}
    }
  }

  if (typeof window !== "undefined") window.showAlert = showAlert;

  function showConfirm(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      try {
        const id = "site-alerts";
        let $container = $("#" + id);
        if (!$container.length) {
          $container = $("<div>").attr("id", id).addClass("alerts-container");
          $("body").append($container);
        }

        const $wrap = $("<div>").addClass("confirm-wrap");
        const $box = $("<div>").addClass("confirm-box");
        const $msg = $("<div>").addClass("confirm-message").text(message);
        const $actions = $("<div>").addClass("confirm-actions");

        const $btnCancel = $("<button>")
          .addClass("btn btn-outline-light btn-sm")
          .text(opts.cancelText || "Cancel");
        const $btnOk = $("<button>")
          .addClass("btn btn-primary btn-sm")
          .text(opts.confirmText || "Confirm");

        $btnCancel.on("click", function () {
          $wrap.remove();
          resolve(false);
        });
        $btnOk.on("click", function () {
          $wrap.remove();
          resolve(true);
        });

        $actions.append($btnCancel, $btnOk);
        $box.append($msg, $actions);
        $wrap.append($box);
        $container.append($wrap);

        setTimeout(function () {
          $wrap.addClass("show");
        }, 10);
        const cleanup = function (val) {
          $wrap.removeClass("show");
          setTimeout(function () {
            $wrap.remove();
          }, 180);
          resolve(val);
        };
        $btnCancel.on("click", function () {
          cleanup(false);
        });
        $btnOk.on("click", function () {
          cleanup(true);
        });
        $wrap.on("click", function (e) {
          if (e.target === $wrap[0]) cleanup(false);
        });
        $btnOk.focus();
      } catch (e) {
        resolve(false);
      }
    });
  }

  if (typeof window !== "undefined") window.showConfirm = showConfirm;
})();

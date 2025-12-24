function _loadFavourites() {
  try {
    return JSON.parse(localStorage.getItem("favourites.v1") || "[]");
  } catch {
    return [];
  }
}
function _saveFavourites(list) {
  localStorage.setItem("favourites.v1", JSON.stringify(list));
}

function render() {
  const list = _loadFavourites();
  const $target = $("#favList");
  const $empty = $("#empty");
  $target.html("");
  if (!list.length) {
    $empty.prop("hidden", false);
    return;
  }
  $empty.prop("hidden", true);
  list.forEach(function (item) {
    const $el = $("<div>").addClass("fav-item");
    const $img = $("<img>")
      .addClass("fav-cover book-cover")
      .attr("src", item.cover || "img/placeholder-56x84.svg");
    const $meta = $("<div>").addClass("fav-meta");
    const $t = $("<div>")
      .addClass("fav-title")
      .text(item.title || "Untitled");
    const $a = $("<div>")
      .addClass("fav-authors")
      .text(item.authors || "");
    $meta.append($t, $a);
    const $actions = $("<div>").addClass("fav-actions");
    const $open = $("<button>").addClass("btn btn-primary btn-sm").text("Open");
    $open.on("click", function () {
      sessionStorage.setItem("bookKey", item.key || "");
      window.location = "book.html";
    });
    const $del = $("<button>")
      .addClass("btn btn-outline-light btn-sm")
      .text("Remove");
    $del.on("click", function () {
      _saveFavourites(
        _loadFavourites().filter(function (i) {
          return i.key !== item.key;
        })
      );
      console.log("Removed from favourites successfully", {
        item: (function () {
          try {
            return item.title ? decodeURIComponent(item.title) : "";
          } catch (e) {
            return item.title;
          }
        })().toString(),
      });
      render();
      try {
        showAlert("REMOVED FROM FAVOURITES", "success");
      } catch (e) {
        try {
          window.alert("REMOVED FROM FAVOURITES");
        } catch (er) {}
      }
    });
    $actions.append($open, $del);
    $el.append($img, $meta, $actions);
    $target.append($el);
  });
}

$("#clearAll").on("click", async function () {
  const confirmed = await (window.showConfirm
    ? window.showConfirm("Clear all favourites?")
    : Promise.resolve(window.confirm("Clear all favourites?")));
  if (!confirmed) return;
  localStorage.removeItem("favourites.v1");
  render();
  try {
    showAlert("CLEARED ALL FAVOURITES", "success");
  } catch (e) {
    try {
      window.alert("CLEARED ALL FAVOURITES");
    } catch (er) {}
  }
  console.log("Cleared all favourites");
});

render();

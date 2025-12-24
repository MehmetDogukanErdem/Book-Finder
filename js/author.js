$(document).ready(getAuthor);

function fetchJson(url) {
  return new Promise(function (resolve) {
    $.getJSON(url)
      .done(function (data) {
        resolve({ data: data });
      })
      .fail(function () {
        resolve(null);
      });
  });
}

async function getAuthor() {
  let key = sessionStorage.getItem("authorKey");
  if (!key) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("key");
    if (q) key = q;
  }

  if (!key) {
    $("#author").html('<div class="empty">No author selected.</div>');
    return;
  }

  const normalizedKey = String(key).startsWith("/")
    ? String(key)
    : `/${String(key)}`;

  try {
    const resp = await fetchJson(
      `https://openlibrary.org${normalizedKey}.json`
    );
    const author = resp && resp.data ? resp.data : {};

    const photo =
      author.photos && author.photos.length
        ? `https://covers.openlibrary.org/a/id/${author.photos[0]}-L.jpg`
        : "";
    const name = author.name || author.personal_name || "Unknown";
    let bio = "";
    if (author.bio)
      bio =
        typeof author.bio === "string" ? author.bio : author.bio.value || "";

    const birth = author.birth_date || "";
    const death = author.death_date || "";

    let metaHtml = "";
    const metaParts = [];
    if (birth)
      metaParts.push(
        `<span class="me-3"><strong>Born:</strong> ${birth}</span>`
      );
    if (death) metaParts.push(`<span><strong>Died:</strong> ${death}</span>`);
    if (metaParts.length) metaHtml += `<p>${metaParts.join("")}</p>`;
    if (author.personal_name && author.personal_name !== name)
      metaHtml += `<p><strong>Also known as:</strong> ${author.personal_name}</p>`;

    const authorHtml = `
      <div class="row">
        <div class="col-12 col-md-4 mb-3 text-center">
          ${
            photo
              ? `<img src="${photo}" class="img-fluid rounded author-photo">`
              : `<div class="placeholder rounded bg-light p-5">No photo</div>`
          }
        </div>
        <div class="col-12 col-md-8">
          <h2>${name}</h2>
          ${bio ? `<p>${bio}</p>` : ""}
          ${metaHtml}
          <div class="mb-3">
            <a href="https://openlibrary.org${normalizedKey}" target="_blank" class="btn btn-outline-secondary btn-sm">View on Open Library</a>
            <a href="index.html" class="btn btn-secondary btn-sm">Back to Homepage</a>
          </div>
        </div>
      </div>
      <hr>
      <div id="author-books"><h5>Books</h5><div class="list-group" id="books-list"><div class="muted">Loading books…</div></div></div>
    `;

    $("#author").html(authorHtml);

    // Yazarın kitaplarını getir
    try {
      const wres = await fetchJson(
        `https://openlibrary.org${normalizedKey}/works.json?limit=12`
      );
      const entries =
        wres && wres.data && wres.data.entries ? wres.data.entries : [];
      const $listEl = $("#books-list");
      if (!entries.length) {
        $listEl.html('<div class="empty">No books found.</div>');
      } else {
        $listEl.html(
          entries
            .map(function (e) {
              const title = e.title || "Untitled";
              const wk = e.key || "";
              return `<a href="book.html" class="list-group-item list-group-item-action work-link" data-key="${wk}" data-title="${encodeURIComponent(title)}">${title}</a>`;
            })
            .join("")
        );

        $(".work-link").on("click", function (e) {
          e.preventDefault();
          const k = $(this).attr("data-key");
          if (!k) return;
          sessionStorage.setItem("bookKey", k);
          sessionStorage.setItem("bookAuthors", name);
          window.location = "book.html";
        });
      }
    } catch (e) {
      $("#books-list").html('<div class="empty">Could not load books.</div>');
    }
  } catch (err) {
    console.error(err);
    $("#author").html(
      '<div class="empty">Could not load author details.</div>'
    );
  }
}

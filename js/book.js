$(document).ready(getBook);

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

async function getBook() {
  const key = sessionStorage.getItem("bookKey");
  if (!key) return;

  try {
    const normalizedKey = String(key).startsWith("/")
      ? String(key)
      : `/${String(key)}`;
    const resp = await fetchJson(
      `https://openlibrary.org${normalizedKey}.json`
    );
    const book = resp && resp.data;

    const cover =
      book.covers && book.covers.length
        ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg`
        : "";
    const desc = book.description
      ? typeof book.description === "string"
        ? book.description
        : book.description.value
      : "No description available";

    let authorEntries = [];
    if (Array.isArray(book.authors) && book.authors.length) {
      const promises = book.authors.map(function (a) {
        if (!a) return Promise.resolve({ name: null, key: null });

        if (a.name)
          return Promise.resolve({ name: a.name, key: a.key || null });

        if (a.author && typeof a.author === "object") {
          if (a.author.name)
            return Promise.resolve({
              name: a.author.name,
              key: a.author.key || null,
            });
          if (a.author.key) {
            const raw = String(a.author.key);
            const k = raw.startsWith("/") ? raw : `/${raw}`;
            return fetchJson(`https://openlibrary.org${k}.json`)
              .then(function (r) {
                return { name: r && r.data && r.data.name, key: k };
              })
              .catch(function () {
                return { name: null, key: k };
              });
          }
        }

        if (a.key) {
          const raw = String(a.key);
          const k = raw.startsWith("/") ? raw : `/${raw}`;
          return fetchJson(`https://openlibrary.org${k}.json`)
            .then(function (r) {
              return { name: r && r.data && r.data.name, key: k };
            })
            .catch(function () {
              return { name: null, key: k };
            });
        }

        return Promise.resolve({ name: null, key: null });
      });

      authorEntries = (await Promise.all(promises)).map(function (x) {
        return x || { name: null, key: null };
      });
    }

    const subjects = Array.isArray(book.subjects)
      ? book.subjects
      : Array.isArray(book.subject)
      ? book.subject
      : [];

    let editions = [];
    try {
      const edRes = await fetchJson(
        `https://openlibrary.org${normalizedKey}/editions.json?limit=6`
      );
      editions =
        edRes && edRes.data && edRes.data.entries ? edRes.data.entries : [];
    } catch (err) {
      if (book.works && book.works.length && book.works[0].key) {
        try {
          const edRes2 = await fetchJson(
            `https://openlibrary.org${book.works[0].key}/editions.json?limit=6`
          );
          editions =
            edRes2 && edRes2.data && edRes2.data.entries
              ? edRes2.data.entries
              : [];
        } catch (e) {
          editions = [];
        }
      }
    }

    console.debug("raw book.authors:", book.authors);
    console.debug("resolved authorEntries:", authorEntries);
    const authorNames = authorEntries
      .map(function (a) {
        return a.name;
      })
      .filter(Boolean);
    let authorHtml;
    if (authorNames.length) {
      authorHtml = authorEntries
        .map(function (a) {
          if (a.name && a.key)
            return `<a href="author.html" class="author-link" data-key="${a.key}">${a.name}</a>`;
          if (a.name) return `${a.name}`;
          return null;
        })
        .filter(Boolean)
        .join(", ");
    } else {
      const fallback =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("bookAuthors")
          : null;
      if (fallback) {
        authorHtml = fallback;
      } else {
        authorHtml = "Unknown";
      }
    }

    const subjectsHtml =
      subjects && subjects.length
        ? subjects
            .slice(0, 12)
            .map(function (s) {
              return `<span class="badge bg-secondary me-1 mb-1">${s}</span>`;
            })
            .join("")
        : "";

    let languages = [];
    if (Array.isArray(book.languages) && book.languages.length) {
      languages = book.languages
        .map(function (l) {
          return typeof l === "string"
            ? l.replace("/languages/", "")
            : l.key
            ? l.key.replace("/languages/", "")
            : null;
        })
        .filter(Boolean);
    } else if (book.language) {
      languages = Array.isArray(book.language)
        ? book.language
        : [book.language];
    }

    window.__langCache = window.__langCache || {};

    const twoToThree = {
      en: "eng",
      tr: "tur",
      es: "spa",
      fr: "fra",
      de: "deu",
      it: "ita",
      pt: "por",
      ru: "rus",
      zh: "zho",
      ja: "jpn",
    };

    async function resolveLangName(code) {
      if (!code) return null;
      const raw = String(code).replace("/languages/", "").toLowerCase();
      if (window.__langCache[raw]) return window.__langCache[raw];

      try {
        if (
          raw.length === 2 &&
          typeof Intl !== "undefined" &&
          Intl.DisplayNames
        ) {
          const dn = new Intl.DisplayNames([navigator.language || "en"], {
            type: "language",
          });
          const n = dn.of(raw);
          if (n) {
            window.__langCache[raw] = n;
            return n;
          }
        }
      } catch (e) {}

      const tryCodes = [raw];
      if (raw.length === 2 && twoToThree[raw]) tryCodes.push(twoToThree[raw]);
      if (raw.length === 3 && raw.slice(0, 2) && twoToThree[raw.slice(0, 2)])
        tryCodes.unshift(raw.slice(0, 2));

      for (const c of tryCodes) {
        try {
          const r = await fetchJson(
            `https://openlibrary.org/languages/${c}.json`
          );
          if (r && r.data && (r.data.name || r.data.title)) {
            const name = r.data.name || r.data.title;
            window.__langCache[raw] = name;
            return name;
          }
        } catch (e) {}
      }

      const fallback = raw.toUpperCase();
      window.__langCache[raw] = fallback;
      return fallback;
    }
    if (
      (!languages || !languages.length) &&
      Array.isArray(editions) &&
      editions.length
    ) {
      const fromEd = new Set();
      editions.forEach(function (ed) {
        if (Array.isArray(ed.languages)) {
          ed.languages.forEach(function (l) {
            if (typeof l === "string") fromEd.add(l.replace("/languages/", ""));
            else if (l && l.key)
              fromEd.add(String(l.key).replace("/languages/", ""));
          });
        }
        if (ed.language) {
          if (Array.isArray(ed.language))
            ed.language.forEach(function (l) {
              fromEd.add(String(l).replace("/languages/", ""));
            });
          else fromEd.add(String(ed.language).replace("/languages/", ""));
        }
      });
      languages = Array.from(fromEd).filter(Boolean);
    }

    const normalized = (languages || []).map(function (c) {
      return String(c).replace("/languages/", "").toLowerCase();
    });
    const languagesHtml =
      normalized && normalized.length
        ? normalized
            .map(function (c) {
              return `<span class="badge bg-info text-dark me-1 mb-1 lang-badge" data-lang="${c}">${c}</span>`;
            })
            .join("")
        : "";

    let editionsHtml = "";
    if (editions && editions.length) {
      editionsHtml =
        '<div class="mt-3"><h6>Editions (sample)</h6><div class="list-group">';
      editions.forEach(function (ed) {
        const pub =
          ed.publishers && ed.publishers.length
            ? ed.publishers[0]
            : ed.publisher || "Unknown";
        const pubDate = ed.publish_date || ed.publish_date || "N/A";
        const pages = ed.number_of_pages || ed.pages || "N/A";
        const isbn =
          ed.isbn_10 && ed.isbn_10.length
            ? ed.isbn_10[0]
            : ed.isbn_13 && ed.isbn_13.length
            ? ed.isbn_13[0]
            : "";
        editionsHtml += `<div class="list-group-item">
              <div><strong>${pub}</strong> <small class="muted">${pubDate}</small></div>
              <div class="muted">Pages: ${pages} ${
          isbn ? "• ISBN: " + isbn : ""
        }</div>
            </div>`;
      });
      editionsHtml += "</div></div>";
    }

    const shortAuthors = authorNames.length
      ? authorNames.join(", ")
      : typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("bookAuthors") || ""
      : "";
    const encAuthors = encodeURIComponent(shortAuthors);
    const encTitle = encodeURIComponent(book.title || "");
    const encCover = encodeURIComponent(cover || "");

    const output = `
          <div class="row">
            <div class="col-12 col-md-4 mb-3">
              ${
                cover
                  ? `<img src="${cover}" class="img-fluid book-cover rounded">`
                  : ""
              }
            </div>
            <div class="col-12 col-md-8">
              <h2>${book.title}</h2>
                <ul class="list-group mb-3">
                <li class="list-group-item"><strong>Authors:</strong> ${authorHtml}</li>
                <li class="list-group-item"><strong>First published:</strong> ${
                  book.first_publish_date || book.first_publish_year || "N/A"
                }</li>
                ${
                  subjects && subjects.length
                    ? `<li class="list-group-item"><strong>Subjects:</strong> ${subjectsHtml}</li>`
                    : ""
                }
                ${
                  languagesHtml
                    ? `<li class="list-group-item"><strong>Languages:</strong> ${languagesHtml}</li>`
                    : ""
                }
              </ul>
              <p>${desc}</p>
              ${editionsHtml}
              <div class="mt-3">
                  <a href="https://openlibrary.org${normalizedKey}" target="_blank" class="btn btn-primary">View on Open Library</a>
                  <button class="btn btn-outline-light" onclick="(function(){ if(window.addToFavourites) { window.addToFavourites('${normalizedKey}','${encAuthors}','${encTitle}','${encCover}'); } else if(window.addToFavouritesFromDetail) { window.addToFavouritesFromDetail('${normalizedKey}','${encAuthors}','${encTitle}','${encCover}'); } else { (window.showAlert ? window.showAlert('Favourites not available','info') : alert('Favourites not available')); } })()">☆ Favourites</button>
                <a href="index.html" class="btn btn-secondary">Back to Homepage</a>
              </div>
            </div>
          </div>
        `;

    $("#book").html(output);

    $(".author-link").on("click", function (e) {
      e.preventDefault();
      const k = $(this).attr("data-key");
      if (!k) return;
      sessionStorage.setItem("authorKey", k);
      sessionStorage.setItem("bookAuthors", shortAuthors || "");
      window.location = "author.html";
    });

    $(".lang-badge").each(async function () {
      const $node = $(this);
      const code = $node.attr("data-lang");
      try {
        const name = await resolveLangName(code);
        $node.text(name || code);
      } catch (e) {
        $node.text(code);
      }
    });

    window.addToFavouritesFromDetail = function (
      key,
      encodedAuthors,
      encodedTitle,
      encodedCover
    ) {
      try {
        const normalized = String(key || "");
        const title = encodedTitle ? decodeURIComponent(encodedTitle) : "";
        const authors = encodedAuthors
          ? decodeURIComponent(encodedAuthors)
          : "";
        const cover = encodedCover ? decodeURIComponent(encodedCover) : "";
        const raw = localStorage.getItem("favourites.v1") || "[]";
        const list = JSON.parse(raw);
        if (
          list.find(function (i) {
            return i.key === normalized;
          })
        ) {
          showAlert("ALREADY IN FAVOURITES", "info");
          return;
        }
        list.push({
          key: normalized,
          title: title,
          authors: authors,
          cover: cover,
          added: Date.now(),
        });
        localStorage.setItem("favourites.v1", JSON.stringify(list));
        showAlert("ADDED TO FAVOURITES", "success");
      } catch (e) {
        console.error("COULD NOT NOT ADD TO FAVOURITES", e);
        showAlert("COULD NOT ADD TO FAVOURITES", "failed");
      }
    };
  } catch (err) {
    console.error(err);
    $("#book").html('<div class="empty">Could not load book details.</div>');
  }
}

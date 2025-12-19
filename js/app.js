$(document).ready(() => {
  // Yapılan aramaya göre ilgili kitapları sayfaya getirir
  $('#searchForm').on('submit', (e) => {
    e.preventDefault();
    const searchText = $('#searchText').val().trim();
    if (searchText) {
      $('#sectionTitle').text(`Search results for "${searchText}"`);
      getBooks(searchText);
    }
  });

  //Arama kutusu boş olduğunda ana sayfa popüler kitapları gösterir
  const initialQuery = $('#searchText').val().trim();
  if (!initialQuery) {
    $('#sectionTitle').text('Most Popular');
    getPopularBooks();
  }

  // Load More basıldığında sayfaya yeni kitaplar ekler
  $(document).on('click', '#loadMoreBtn', function (e) {
    e.preventDefault();
    window.__popularPage = (window.__popularPage || 0) + 1;
    renderPopularPage();
  });

  // Favourites butonuna tıklayınca listeye kitap ekler
  $(document).on('click', '.js-add-fav', function (e) {
    e.preventDefault();
    const $btn = $(this);
    const key = $btn.attr('data-key') || '';
    const authors = $btn.attr('data-authors') || '';
    const title = $btn.attr('data-title') || '';
  const cover = $btn.attr('data-cover') || '';
  console.log('Added to favourites successfully', { title: (() => { try { return title ? decodeURIComponent(title) : ''; } catch (e) { return title; } })().toString() });
    if (!key) {
      console.warn('Add-to-favourites button clicked but missing data-key', { dataset: $btn.data(), element: $btn });
      showAlert('Could not add to favourites: missing book key (check console).', 'failed');
      return;
    }
    addToFavourites(key, authors, title, cover);
  });
});

window.__mergedPopularWorks = window.__mergedPopularWorks || [];
window.__popularPage = window.__popularPage || 0;

//Popüler kitapları API'den çağırır, renderPopularPage fonksiyonunu kullanıp sayfaya ekler
function getPopularBooks() {
  const cacheKey = 'popularBooks';
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      window.__mergedPopularWorks = JSON.parse(cached);
      window.__popularPage = 0;
      renderPopularPage();
      return; 
    } catch (e) {
      
    }
  }
  const fallbackSubjects = ['bestsellers','popular','mystery','fantasy','young-adult','film','horror','science-fiction','romance','history','adventure','children'];

  (async () => {
    let subjects = [];
    try {
      const broad = await axios.get('https://openlibrary.org/search.json?q=the&limit=200').catch(() => null);
      const docs = (broad && broad.data && broad.data.docs) ? broad.data.docs : [];
      const counts = {};
      docs.forEach(d => {
        const sarr = d.subject || d.subjects || [];
        if (Array.isArray(sarr)) {
          sarr.forEach(s => {
            if (!s) return;
            const key = String(s).toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          });
        }
      });

      const top = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 12);
      // Konu başlıklarındaki boşlukları ve özel karakterleri "-" ile değiştirip yazıyı da küçük harf yapar En Popüler yerine "en-populer" gibi
      const slugify = str => String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      subjects = top.map(slugify).filter(Boolean);
      if (!subjects.length) subjects = fallbackSubjects;
    } catch (e) {
      subjects = fallbackSubjects;
    }

    const requests = subjects.map(s => axios.get(`https://openlibrary.org/subjects/${encodeURIComponent(s)}.json?limit=12`).catch(() => null));

    // Tüm istekler tamamlandığında kitapları tek dizi altında birleştirme
    Promise.all(requests)
      .then((responses) => {
      let allWorks = [];
      responses.forEach((r) => {
        if (!r || !r.data) return;
        const works = r.data.works || [];
        allWorks = allWorks.concat(works);
      });

      // Her kitabı sadece bir kez eklemek için filtreleme
      const seen = {};
      const merged = [];
      allWorks.forEach((w) => {
        if (!w || !w.key) return;
        if (!seen[w.key]) {
          seen[w.key] = true;
          merged.push(w);
        }
      });

      // Kitapları baskı sayısına göre azalan şekilde sıralama
      merged.sort((a, b) => (b.edition_count || 0) - (a.edition_count || 0));

      window.__mergedPopularWorks = merged;
      window.__popularPage = 0;
      
      renderPopularPage();
      try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch(e) { console.warn('Cache error', e); }
    })
    .catch((err) => {
      console.error(err);
      $('#books').html('<div class="empty">Could not load popular books.</div>');
      $('#loadMoreWrap').hide();
    });
  })();
}

// Popüler kitapları renderlayarak getPopularBooks fonksiyonu içerisinde kitapları sayfaya eklemek için çağırılır
function renderPopularPage() {
  const perPage = 24;
  const page = window.__popularPage || 0;
  const all = window.__mergedPopularWorks || [];
  const start = page * perPage;
  const slice = all.slice(start, start + perPage);

  if (!slice.length && page === 0) {
    $('#books').html('<div class="empty">No popular books found.</div>');
    $('#loadMoreWrap').hide();
    return;
  }

  let output = '';
  $.each(slice, (index, work) => {
    let cover = '';
    if (work.cover_id) {
      cover = `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`;
    } else if (work.cover_edition_key) {
      cover = `https://covers.openlibrary.org/b/olid/${work.cover_edition_key}-M.jpg`;
    } else if (work.edition_key && work.edition_key.length) {
      cover = `https://covers.openlibrary.org/b/olid/${work.edition_key[0]}-M.jpg`;
    } else {
      cover = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="100%" height="100%" fill="%230b1220"/><text x="50%" y="50%" fill="%239fb0c8" font-family="Arial, sans-serif" font-size="16" dominant-baseline="middle" text-anchor="middle">No cover</text></svg>';
    }

    const title = work.title || 'Untitled';
    const key = work.key || (work.cover_edition_key ? `/works/${work.cover_edition_key}` : '');

    let cardAuthors = '';
    if (Array.isArray(work.authors) && work.authors.length) {
      cardAuthors = work.authors.map(a => (a && (a.name || (a.author && a.author.name))) ? (a.name || a.author.name) : null).filter(Boolean).slice(0,2).join(', ');
    } else if (work.author_name && Array.isArray(work.author_name)) {
      cardAuthors = work.author_name.slice(0,2).join(', ');
  }

  const encodedAuthors = encodeURIComponent(cardAuthors || '');
  const encodedTitle = encodeURIComponent(title || '');
  const encodedCover = encodeURIComponent(cover || '');

  //Kitap bilgilerinin olduğu kartları oluşturan HTML
  output += `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
        <div class="card text-center h-100 fade-in">
          <img src="${cover}" class="card-img-top book-cover" alt="${title}">
          <div class="card-body">
            <h6 class="card-title">${title}</h6>
            ${cardAuthors ? `<div class="muted" style="font-size:0.8rem">${cardAuthors}</div>` : ''}
            <a onclick="bookSelected('${key}','${encodedAuthors}')" href="#" class="btn btn-primary btn-sm">Details</a>
            <button class="btn btn-outline-light btn-sm js-add-fav" data-key="${key}" data-authors="${encodedAuthors}" data-title="${encodedTitle}" data-cover="${encodedCover}">☆ Favourites</button>
          </div>
        </div>
      </div>
    `;
  });

  if (page === 0) {
    $('#books').html(output);
  } else {
    $('#books').append(output);
  }

  const more = (all.length > (page + 1) * perPage);
  if (more) {
    $('#loadMoreWrap').show();
  } else {
    $('#loadMoreWrap').hide();
  }
}

//Search özelliği ile arama yapıldığında API'den ilgili kitap bilgilerini getirip sayfaya onları yansıtır
function getBooks(searchText) {
  axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchText)}`)
    .then((response) => {
      const books = (response.data.docs || []).slice(0, 24);
      let output = '';

      $.each(books, (index, book) => {
        if (!book.cover_i || !book.title) return;
        const cover = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
        const authors = book.author_name ? (book.author_name.slice(0,2).join(', ')) : '';
        const encoded = encodeURIComponent(authors || '');

        output += `
                <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                  <div class="card text-center h-100">
                    <img src="${cover}" class="card-img-top book-cover" alt="${book.title}">
              <div class="card-body">
                <h6 class="card-title">${book.title}</h6>
                ${authors ? `<div class="muted" style="font-size:0.8rem">${authors}</div>` : ''}
                  <a onclick="bookSelected('${book.key}','${encoded}')" href="#" class="btn btn-primary btn-sm">Details</a>
                  <button class="btn btn-outline-light btn-sm js-add-fav" data-key="${book.key}" data-authors="${encoded}" data-title="${encodeURIComponent(book.title || '')}" data-cover="${encodeURIComponent(cover)}">☆ Favourites</button>
              </div>
            </div>
          </div>
        `;
      });

      if (!output) {
        $('#books').html('<div class="empty">No results found.</div>');
      } else {
        $('#books').html(output);
      }
    })
    .catch((err) => console.error(err));
}

// Kitap detay sayfasına yönlendirme fonksiyonu
function bookSelected(key, encodedAuthors) {
  const normalized = String(key || '');
  sessionStorage.setItem('bookKey', normalized);
  try {
    const authors = encodedAuthors ? decodeURIComponent(encodedAuthors) : '';
    if (authors) sessionStorage.setItem('bookAuthors', authors);
  } catch (e) {
    if (encodedAuthors) sessionStorage.setItem('bookAuthors', encodedAuthors);
  }
  window.location = 'book.html';
  return false;
}



function _loadFavourites() {
  try { 
    return JSON.parse(localStorage.getItem('favourites.v1') || '[]');
  } catch (e) {
    return [];
  }
}

function _saveFavourites(list) {
  localStorage.setItem('favourites.v1', JSON.stringify(list));
}

function addToFavourites(key, encodedAuthors, encodedTitle, encodedCover) {
  const normalized = String(key || '');
  const title = encodedTitle ? decodeURIComponent(encodedTitle) : '';
  const authors = encodedAuthors ? decodeURIComponent(encodedAuthors) : '';
  const cover = encodedCover ? decodeURIComponent(encodedCover) : '';

  const list = _loadFavourites();
  if (list.find(i => i.key === normalized)) {
    showAlert('ALREADY IN FAVOURITES', 'info');
    return;
  }
  list.push({ key: normalized, title: title, authors: authors, cover: cover, added: Date.now() });
  _saveFavourites(list);
  showAlert('ADDED TO FAVOURITES', 'success');
}

function removeFavourite(key) {
  const list = _loadFavourites();
  const remaining = list.filter(i => i.key !== String(key));
  _saveFavourites(remaining);
  if (window.location.pathname.endsWith('favourites.html') || window.location.pathname.endsWith('/favourites.html')) {
    window.location.reload();
  }
}

function openFavouritesPage() {
  window.location = 'favourites.html';
}

function addToFavouritesFromDetail(key, encodedAuthors, encodedTitle, encodedCover) {
  try {
    return addToFavourites(key, encodedAuthors, encodedTitle, encodedCover);
  } catch (e) {
    const normalized = String(key || '');
    const title = encodedTitle ? decodeURIComponent(encodedTitle) : '';
    const authors = encodedAuthors ? decodeURIComponent(encodedAuthors) : '';
    const cover = encodedCover ? decodeURIComponent(encodedCover) : '';
    const list = _loadFavourites();
    if (list.find(i => i.key === normalized)) { showAlert('ALREADY IN FAVOURITES', 'info'); return; }
    list.push({ key: normalized, title: title, authors: authors, cover: cover, added: Date.now() });
    _saveFavourites(list);
    showAlert('ADDED TO FAVOURITES', 'success');
  }
}

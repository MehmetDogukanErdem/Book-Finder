function _loadFavourites() {
      try { return JSON.parse(localStorage.getItem('favourites.v1') || '[]'); } catch { return []; }
    }
    function _saveFavourites(list) { localStorage.setItem('favourites.v1', JSON.stringify(list)); }



    function render() {
      const list = _loadFavourites();
      const target = document.getElementById('favList');
      const empty = document.getElementById('empty');
      target.innerHTML = '';
      if (!list.length) { empty.hidden = false; return; }
      empty.hidden = true;
      list.forEach(item => {
        const el = document.createElement('div');
        el.className = 'fav-item';
  const img = document.createElement('img');
  img.className = 'fav-cover book-cover';
    img.src = item.cover || 'img/placeholder-56x84.svg';
        const meta = document.createElement('div');
        meta.className = 'fav-meta';
        const t = document.createElement('div'); t.className = 'fav-title'; t.textContent = item.title || 'Untitled';
        const a = document.createElement('div'); a.className = 'fav-authors'; a.textContent = item.authors || '';
        meta.appendChild(t); meta.appendChild(a);
        const actions = document.createElement('div'); actions.className = 'fav-actions';
        const open = document.createElement('button'); open.className = 'btn btn-primary btn-sm'; open.textContent = 'Open';
        open.onclick = () => { sessionStorage.setItem('bookKey', item.key || ''); window.location = 'book.html'; };
        const del = document.createElement('button'); del.className = 'btn btn-outline-light btn-sm'; del.textContent = 'Remove';
        del.onclick = () => {
          _saveFavourites(_loadFavourites().filter(i => i.key !== item.key));
          console.log('Removed from favourites successfully', { item: (() => { try { return item.title ? decodeURIComponent(item.title) : ''; } catch (e) { return item.title; } })().toString() });
          render();
          try { showAlert('REMOVED FROM FAVOURITES', 'success'); } catch (e) { try { window.alert('REMOVED FROM FAVOURITES'); } catch (er) {} }
        };
        actions.appendChild(open); actions.appendChild(del);
        el.appendChild(img); el.appendChild(meta); el.appendChild(actions);
        target.appendChild(el);
      });
    }

    document.getElementById('clearAll').addEventListener('click', async () => {
      const confirmed = await (window.showConfirm ? window.showConfirm('Clear all favourites?') : Promise.resolve(window.confirm('Clear all favourites?')));
      if (!confirmed) return;
      localStorage.removeItem('favourites.v1'); render();
      try { showAlert('CLEARED ALL FAVOURITES', 'success'); } catch (e) { try { window.alert('CLEARED ALL FAVOURITES'); } catch (er) {} }
      console.log('Cleared all favourites');
    });

    render();
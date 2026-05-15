const dataUrl = "https://raw.githubusercontent.com/RanggaWaridat/articles-data/refs/heads/main/anime_articles.json";
const container = document.getElementById("articles-container");

fetch(dataUrl)
  .then(response => response.json())
  .then(data => {
    data.forEach(article => {
      const articleDiv = document.createElement("div");
      articleDiv.classList.add("article");

      articleDiv.innerHTML = `
        <h2>${article.title}</h2>
        <p><strong>Genre:</strong> ${article.genre}</p>
        <p><strong>Published:</strong> ${article.published_date}</p>
        <p>${article.description}</p>
      `;

      container.appendChild(articleDiv);
    });
  })
  .catch(error => {
    container.innerHTML = "<p>Gagal memuat artikel. Silakan coba lagi nanti.</p>";
    console.error("Error fetching data:", error);
  });

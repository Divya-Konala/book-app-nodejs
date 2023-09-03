document.addEventListener("click", async (e) => {
  e.preventDefault();
  if (e.target.classList.contains("add_book")) {
    const title = document.getElementById("title");
    const author = document.getElementById("author");
    const price = document.getElementById("price");
    const category = document.getElementById("category");
    if (!title.value || !author.value || !price.value || !category.value) {
      alert("Please fill data in all the fields");
      return;
    }

    axios
      .post("/create-item", {
        title: title.value,
        author: author.value,
        price: price.value,
        category: category.value,
      })
      .then((res) => {
        if (res.data.status == 201) {
          document.getElementById(
            "book_list"
          ).innerHTML += `<div class="list-group-item">
          <h1 class="title"> ${title.value}</h1>
          <p class="author">By ${author.value}</p>
          <p class="category">Category: ${category.value} </p>
          <p class="price">Price: ₹${price.value}</p>
          <div>
          <button data-id="${res.data.data._id}" class="edit-me">Edit</button>
          <button data-id="${res.data.data._id}" class="delete-me">Delete</button>
      </div>
      </div>`;
          title.value = "";
          author.value = "";
          price.value = "";
          category.value = "";
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  } else if (e.target.classList.contains("edit-me")) {
    const bookId = e.target.getAttribute("data-id");
    // Fetch the book data using bookId from the server
    axios
      .get(`/get-book/${bookId}`)
      .then((res) => {
        if (res.data.status === 200) {
          const bookData = res.data.data;
          // Set the book data in the edit form
          document.getElementById("edit_title").value = bookData.title;
          document.getElementById("edit_author").value = bookData.author;
          document.getElementById("edit_price").value = bookData.price;
          document.getElementById("edit_category").value = bookData.category;

          // Display the custom prompt (modal)
          showCustomPrompt();

          // Save the bookId in a hidden field to use it later when submitting the edit form
          document.getElementById("edit_book_id").value = bookId;
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  } else if (e.target.classList.contains("delete-me")) {
    let id = e.target.getAttribute("data-id");
    axios
      .post("/delete-item", { id })
      .then((res) => {
        if (res.data.status == 200) {
          e.target.parentElement.parentElement.remove();
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        alert(error);
      });
  }
});

window.onload = function () {
  displayBookList();
};

function displayBookList() {
  //read book list
  axios
    .get(`/dashboarddata`)
    .then((res) => {
      if (res.data.status != 200) {
        console.log(res.data);
        alert(res.data.message);
        return;
      }
      const books = res.data.data;
      document.getElementById("book_list").insertAdjacentHTML(
        "beforeend",
        books
          .map((item) => {
            return `<div class="list-group-item">
        <h1 class="title"> ${item.title}</h1>
        <p class="author">By ${item.author}</p>
        <p class="category">Category: ${item.category} </p>
        <p class="price">Price: ₹${item.price}</p>
        <div>
        <button data-id="${item._id}" class="edit-me">Edit</button>
        <button data-id="${item._id}" class="delete-me">Delete</button>
    </div>
    </div>`;
          })
          .join("")
      );
      // skip += books.length;
    })
    .catch((error) => {
      alert(error);
    });
}

function showCustomPrompt() {
  const customPrompt = document.getElementById("customPrompt");
  customPrompt.style.display = "block";
}

function closeCustomPrompt() {
  const customPrompt = document.getElementById("customPrompt");
  customPrompt.style.display = "none";
}

function submitCustomPrompt() {
  const title = document.getElementById("edit_title").value;
  const author = document.getElementById("edit_author").value;
  const price = document.getElementById("edit_price").value;
  const category = document.getElementById("edit_category").value;
  const bookId = document.getElementById("edit_book_id").value;

  axios
    .post(`/edit-item/${bookId}`, { title, author, price, category })
    .then((res) => {
      if (res.data.status === 200) {
        // Update the book details in the user interface without reloading the page
        const bookElement = document.querySelector(`[data-id="${bookId}"]`)
          .parentElement.parentElement;
        bookElement.querySelector(".title").textContent = title;
        bookElement.querySelector(".author").textContent = `By ${author}`;
        bookElement.querySelector(".price").textContent = `Price: ${price}`;
        bookElement.querySelector(
          ".category"
        ).textContent = `Category: ${category}`;
      } else {
        alert(res.data.message);
      }
    })
    .catch((error) => {
      alert(error);
    });

  closeCustomPrompt(); // Close the custom prompt after submission
}

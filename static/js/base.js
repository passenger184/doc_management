// let currentFolder = {
//   id: null,
//   name: "",
//   path: [],
// };
let currentFolder = { id: null, name: "", parent: null };

let uploadedFile = null; // Declare globally
let dropzone = null; // Declare Dropzone globally

document.addEventListener("DOMContentLoaded", function () {
  // fetchFolders();
  fetchFilesAndFolders();
});

// Function to handle file upload with category selection
function uploadFileWithCategory() {
  // const uploadUrl = currentFolder.id ? `/file-upload/${currentFolder.id}/` : '/file-upload/';
  const uploadUrl = currentFolder.id
    ? `/file-upload/${currentFolder.id}/`
    : "/file-upload/";
  console.log(currentFolder);
  if (!uploadedFile) {
    // alert("No file selected!");
    return;
  }

  let selectedCategory = document.querySelector(
    'input[name="category_id"]:checked'
  );
  if (!selectedCategory) {
    // alert("Please select a category!");
    return;
  }

  let categoryId = selectedCategory.value;
  let fileName = uploadedFile.name;
  let folderName = currentFolder.name;

  console.log("folderName:", folderName);

  function createFormData() {
    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("category_id", categoryId);
    if (currentFolder.id !== null) {
      formData.append("folder_id", currentFolder.id);
    } else {
      formData.append("folder_id", ""); // Send empty string for root folder
    }
    return formData;
  }

  fetch(uploadUrl, {
    method: "POST",
    body: createFormData(),
  })
    .then((response) => response.json())
    .then((data) => {
      fetchFilesAndFolders(currentFolder.id);
      console.log("File uploaded successfully", data);
      console.log("currentFolder.id", currentFolder.id);
      // currentFolder.name = data.folder_name;
      // alert("File uploaded successfully!");
      if (data.file) {
        showNotification(data.file.name);
        console.log(data.file.name);
      }
      // Remove file from Dropzone UI if Dropzone is initialized
      if (dropzone) {
        dropzone.removeFile(uploadedFile);
      }

      uploadedFile = null; // Reset stored file
      showNotification(data.file.name);
      // Close modal
      let modal = bootstrap.Modal.getInstance(
        document.getElementById("categoryModal")
      );
      modal.hide();
      // folderName = data.folder_name;
      console.log("folderName: is good thing", folderName);
      checkIfFilesExist();
    })
    .catch((error) => {
      // Show error modal with file name and folder name
      showErrorModal(
        "Duplicate File", // Title
        "A file with this name already exists in this folder.", // Message
        `<b>Filename: ${fileName}<br><br>Folder: ${folderName}</b>` // Details with line break
      );
    });
}

// Attach the upload function to the modal's button
document
  .getElementById("uploadButton")
  .addEventListener("click", uploadFileWithCategory);

// Function to fetch categories and show modal
function showCategoryModal() {
  fetch("/get-categories/")
    .then((response) => response.json())
    .then((data) => {
      if (data.categories && data.categories.length > 0) {
        const categoryCheckboxesContainer = document.getElementById(
          "category-checkboxes"
        );
        categoryCheckboxesContainer.innerHTML = ""; // Clear previous content

        // Loop through categories and create checkboxes
        data.categories.forEach((category) => {
          const checkboxDiv = document.createElement("div");
          checkboxDiv.classList.add("form-check");

          const checkboxInput = document.createElement("input");
          checkboxInput.classList.add("form-check-input");
          checkboxInput.type = "checkbox";
          checkboxInput.name = "category_id";
          checkboxInput.id = `category${category.id}`;
          checkboxInput.value = category.id;

          const label = document.createElement("label");
          label.classList.add("form-check-label");
          label.setAttribute("for", `category${category.id}`);
          label.textContent = category.name;

          checkboxDiv.appendChild(checkboxInput);
          checkboxDiv.appendChild(label);
          categoryCheckboxesContainer.appendChild(checkboxDiv);
        });

        // Show modal
        let modal = new bootstrap.Modal(
          document.getElementById("categoryModal")
        );
        modal.show();
      } else {
        // alert("No categories available.");
      }
    })
    .catch((error) => {
      console.error("Error fetching categories:", error);
      // alert("Failed to load categories.");
    });
}

// Initialize Dropzone when the page loads
document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector("#myDropzone")) {
    if (Dropzone.instances.length) {
      Dropzone.instances.forEach((dz) => dz.destroy());
    }
    Dropzone.autoDiscover = false;

    dropzone = new Dropzone("#myDropzone", {
      // Assign to global variable
      url: "/file-upload/",
      paramName: "file",
      maxFilesize: 10,
      acceptedFiles:
        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.csv,.json,.xml",
      clickable: [".upload-box", ".upload_card"],
      dictDefaultMessage: "",
      autoProcessQueue: false,

      init: function () {
        let dz = this;

        dz.on("addedfile", function (file) {
          uploadedFile = file; // Store file for later processing
          console.log("File added:", file.name);

          // Show category selection modal
          showCategoryModal();
        });

        dz.on("error", function (file, errorMessage) {
          console.error("Upload failed:", errorMessage);
          // alert("File upload failed!");
        });
      },
    });
  } else {
    console.error("#myDropzone element not found in the DOM.");
  }
});

// Function to create a folder and update UI
function createFolder() {
  let folderName = document.getElementById("cf-folderName").value;
  let parentFolder = currentFolder.name ? currentFolder.name : "Home";
  const folderData = {
    name: document.getElementById("cf-folderName").value,
    parent: currentFolder.id,
  };

  // if (folderName.trim() === "") {
  //     return;
  // }
  fetch(currentFolder.id ? `/folders/${currentFolder.id}/` : "/folders/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(folderData),
  })
    .then((response) =>
      response.ok
        ? fetchFilesAndFolders(currentFolder.id)
        : handleFolderError(response)
    )
    .then((data) => {
      // alert("Folder created successfully: " + data.name);
      console.log(currentFolder.id);
      fetchFilesAndFolders(currentFolder.id);
      // fetchFolders();
      // if (data.folder) {
      //     // showNotification(data.folder.name);
      //     alert("Folder created successfully: " + data.name);
      //   fetchFolders();
      // }
      let modal = bootstrap.Modal.getInstance(
        document.getElementById("cf-createFolderModal")
      );
      modal.hide();
    })
    .catch((error) => {
      showErrorModal(
        "Duplicate Folder", // Title
        "A folder with this name already exists in this location.", // Message
        `<b>Folder name: ${folderName}<br><br>Parent folder: ${parentFolder}</b>` // Details
      );
    });
}

document
  .getElementById("cf-createButton")
  .addEventListener("click", createFolder);
document
  .getElementById("cf-createFolderModal")
  .addEventListener("hidden.bs.modal", function () {
    document.getElementById("cf-folderName").value = "";
  });
// Fetch and display folders
function fetchFolders() {
  fetch("/folders/")
    .then((response) => response.json())
    .then((data) => {
      // Assuming data.folders contains the list of folders
      if (data.folders && data.folders.length > 0) {
        console.log(data.folders);
        // Call fetchFilesAndFolders() with the folder ID of the first folder
        fetchFilesAndFolders(data.folders[0].id);

        // Reset the folder input field (if needed)
        document.getElementById("cf-folderName").value = "";

        // Populate dropdown with folder options
        data.folders.forEach((folder) => {
          const option = document.createElement("option");
          option.value = folder.id;
          option.textContent = folder.name;
          folderSelect.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error fetching folders:", error));
}

// Fetch files and folders, and display them sorted by latest added
function fetchFilesAndFolders(folderId = null) {
  // console.log(folderId);
  const url = folderId ? `/file-upload/${folderId}/` : "/file-upload/";
  // console.log(url);
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.files || !data.folders) {
        console.error("Unexpected API response format:", data);
        return;
      }

      currentFolder.id = data.current_folder ? data.current_folder : null;
      // console.log(data);
      renderFilesAndFolders({ files: data.files, folders: data.folders });
    })
    .catch((error) => {
      console.error("Error fetching files and folders:", error);
      showErrorModal("Load Error", "Failed to load folder contents", error);
    });
}

function renderFilesAndFolders({ folders = [], files = [] }) {
  const combinedData = [...folders, ...files];

  // Sort folders and files separately
  folders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort folders
  files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)); // Sort files

  // Combine them again after sorting
  const sortedData = [...folders, ...files];

  // console.log("Sorted Data:", sortedData);
  updateTable(sortedData);
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return "--";
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (!bytes) return "--";
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}

// Helper function to get file icons
function getFileIcon(fileType) {
  const fileIcons = {
    pdf: "fas fa-file-pdf text-danger",
    doc: "fas fa-file-word text-primary",
    docx: "fas fa-file-word text-primary",
    xls: "fas fa-file-excel text-success",
    xlsx: "fas fa-file-excel text-success",
    ppt: "fas fa-file-powerpoint text-warning",
    pptx: "fas fa-file-powerpoint text-warning",
    txt: "fas fa-file-alt text-muted",
    rtf: "fas fa-file-alt text-muted",
    odt: "fas fa-file-word text-primary",
    ods: "fas fa-file-excel text-success",
    odp: "fas fa-file-powerpoint text-warning",
    csv: "fas fa-file-csv text-success",
    json: "fas fa-file-code text-info",
    xml: "fas fa-file-code text-info",
    zip: "fas fa-file-archive text-secondary",
    default: "fas fa-file text-muted",
  };
  return fileIcons[fileType] || fileIcons["default"];
}

function generateActionButton(fileId) {
  return `
    <td class="position-relative">
      <div class="dropdown">
        <button class="btn btn-light" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="fa fa-ellipsis-v"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end file-action-dropdown">
          <li><a class="dropdown-item" href="#" onclick="viewFile(${fileId})"><i class="fa fa-eye mx-2"></i> View</a></li>
          <li><a class="dropdown-item" href="#" onclick="editFile(${fileId})"><i class="fa fa-pen mx-2"></i> Edit</a></li>
          <li><a class="dropdown-item" href="#" onclick="downloadFile(${fileId})"><i class="fa fa-download mx-2"></i> Download</a></li>
          <li><a class="dropdown-item" href="#" onclick="shareFile(${fileId})"><i class="fa fa-share-alt mx-2"></i> Share</a></li>
          <li><a class="dropdown-item" href="#" onclick="favoriteFile(${fileId})"><i class="fa fa-bookmark mx-2"></i> Favorite</a></li>
          <li><a class="dropdown-item" href="#" onclick="uploadNewVersion(${fileId})"><i class="fa fa-upload mx-2"></i> Upload New Version</a></li>
          <li><a class="dropdown-item" href="#" onclick="viewVersionHistory(${fileId})"><i class="fa fa-history mx-2"></i> Version History</a></li>
          <li><a class="dropdown-item" href="#" onclick="commentOnFile(${fileId})"><i class="fa fa-comment mx-2"></i> Comment</a></li>
          <li><a class="dropdown-item" href="#" onclick="addReminder(${fileId})"><i class="fa fa-bell mx-2"></i> Add Reminder</a></li>
          <li><a class="dropdown-item" href="#" onclick="openCustomModal(${fileId})"><i class="fa fa-envelope mx-2"></i> Send Email</a></li>
          <li><a class="dropdown-item" href="#" onclick="archiveFile(${fileId})"><i class="fa fa-archive mx-2"></i> Archive</a></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="deleteFile(${fileId})"><i class="fa fa-trash mx-2"></i> Delete</a></li>
        </ul>
      </div>
    </td>
  `;
}

function updateTable(files) {
  let tableBody = document.querySelector("table tbody");
  tableBody.innerHTML = ""; // Clear existing content

  files.forEach((file) => {
    const isFolder = file.hasOwnProperty("created_at"); // Determine if it's a folder
    const itemIconClass = isFolder
      ? "fa fa-folder text-primary"
      : getFileIcon(file.file_type);
    const formattedDate = formatDate(
      isFolder ? file.created_at : file.uploaded_at
    );
    const formattedFileSize = isFolder ? "--" : formatFileSize(file.file_size);
    const category = isFolder
      ? "--"
      : file.category
      ? file.category.name
      : "--";

    let row = `<tr ${
      isFolder
        ? `class="folder-row clickable" onclick="handleFolderClick(${file.id}, '${file.name}')"`
        : `class="file-row"`
    }>
      <td class="name-col">
        <i class="${itemIconClass} file-icon"></i>  
        <span class="text-muted">${file.name}</span>
      </td>
      <td><i class="far fa-star" title="Star this file"></i></td>
      <td>Private</td>  
      <td>${category}</td>  
      <td>${formattedDate}</td>
      <td>${formattedFileSize}</td>
      ${!isFolder ? generateActionButton(file.id) : ""}
    </tr>`;

    tableBody.innerHTML += row;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.querySelector("#file-table-section tbody");
  const actionBar = document.getElementById("actionBar");
  const selectedCount = document.getElementById("selected-count");
  const clearSelectionBtn = document.querySelector(".clear-selection");

  let selectedRows = new Set(); // Track selected rows

  // Handle row click for selection (excluding folders)
  tableBody.addEventListener("click", function (event) {
    const row = event.target.closest("tr"); // Get the clicked row
    if (!row || row.classList.contains("folder-row")) return; // Ignore folder rows

    const rowIndex = row.dataset.index; // Use a data attribute for row index

    if (event.ctrlKey || event.metaKey) {
      // Multi-select (Ctrl or Cmd)
      if (selectedRows.has(rowIndex)) {
        row.classList.remove("selected");
        selectedRows.delete(rowIndex);
      } else {
        row.classList.add("selected");
        selectedRows.add(rowIndex);
      }
    } else {
      // Single select (deselect others)
      document
        .querySelectorAll("#file-table-section tbody tr.selected")
        .forEach((el) => {
          el.classList.remove("selected");
        });
      selectedRows.clear();

      row.classList.add("selected");
      selectedRows.add(rowIndex);
    }

    // Show or hide action bar
    if (selectedRows.size > 0) {
      console.log("size:", selectedRows.size);
      actionBar.style.cssText = "display: flex !important;";
      selectedCount.textContent = `${selectedRows.size} selected`;
    } else {
      actionBar.style.display = "none";
    }

    event.stopPropagation(); // Prevent bubbling
  });

  // Click outside to clear selection
  // document.addEventListener("click", function (event) {
  //   if (!event.target.closest("#file-table-section")) {
  //     document
  //       .querySelectorAll("#file-table-section tbody tr.selected")
  //       .forEach((el) => {
  //         el.classList.remove("selected");
  //       });
  //     selectedRows.clear();
  //     actionBar.style.display = "none";
  //   }
  // });

  // Clear selection button
  clearSelectionBtn.addEventListener("click", function () {
    document
      .querySelectorAll("#file-table-section tbody tr.selected")
      .forEach((el) => {
        el.classList.remove("selected");
      });
    selectedRows.clear();
    actionBar.style.display = "none";
  });
});

// Function to format file size into KB, MB, etc.
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  let sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}

// Initial fetch for files and folders on page load

// Function to check if files exist and update UI
function checkIfFilesExist() {
  const folderId = currentFolder?.id || ""; // Use empty string if no folder
  const uploadUrl = folderId ? `/file-upload/${folderId}/` : "/file-upload/";

  console.log("Fetching from:", uploadUrl);

  fetch(uploadUrl)
    .then((response) => response.json())
    .then((data) => {
      console.log("Raw response data:", data);

      if (!data.files || !Array.isArray(data.files)) {
        console.error("Unexpected response format:", data);
        return;
      }

      console.log("Files found:", data.files.length);

      if (data.files.length > 0) {
        document.getElementById("upload-section").style.display = "none";
        document.getElementById("file-table-section").style.display = "block";
        // updateTable([...data.folders, ...data.files]);
        fetchFilesAndFolders(currentFolder.id);
      } else {
        document.getElementById("upload-section").style.display = "block";
        document.getElementById("file-table-section").style.display = "none";
      }
    })
    .catch((error) => console.error("Error fetching files:", error));
}

checkIfFilesExist();

function showNotification(fileName) {
  const notification = document.getElementById("upload-notification");
  const fileNameElement = document.getElementById("file-name");

  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }

  notification.classList.remove("notify");

  setTimeout(() => {
    notification.classList.add("notify");
  }, 5000); // Hide after 5 seconds
}

// Function to handle drag events on Dropzone
window.onload = function () {
  const dropzoneElement = document.getElementById("dropZoneArea");

  if (dropzoneElement) {
    dropzoneElement.addEventListener("dragenter", function () {
      dropzoneElement.classList.add("dragging");
      console.log("Drag started");
    });

    dropzoneElement.addEventListener("dragover", function (e) {
      e.preventDefault(); // Allows the file to be dropped
    });

    // Remove the class *only* when a file is dropped, not when leaving the drop zone
    dropzoneElement.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzoneElement.classList.remove("dragging");
      console.log("File dropped, removing background");
    });
  } else {
    console.error("Dropzone element not found!");
  }
};

window.onload = function () {
  const dropzoneElement = document.getElementById("dropZoneArea");

  if (dropzoneElement) {
    dropzoneElement.addEventListener("dragenter", function () {
      dropzoneElement.classList.add("dragging");
    });

    dropzoneElement.addEventListener("dragover", function (e) {
      e.preventDefault(); // Allows the file to be dropped
    });

    // Remove the class only when a file is dropped
    dropzoneElement.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzoneElement.classList.remove("dragging");
      console.log("File dropped, removing background");
    });

    // Remove the background when clicking outside the drop zone
    document.addEventListener("click", function (e) {
      if (!dropzoneElement.contains(e.target)) {
        dropzoneElement.classList.remove("dragging");
      }
    });
  } else {
    console.error("Dropzone element not found!");
  }
};

// Modified Navigate Function

let folderPath = []; // Stores folder hierarchy

function navigateToFolder(folderId, folderName) {
  if (folderId === null) {
    // Reset to root
    folderPath = [];
  } else {
    // Find if the folder already exists in the path
    const existingIndex = folderPath.findIndex((f) => f.id === folderId);

    if (existingIndex >= 0) {
      // If folder already exists, truncate path to avoid duplicates
      folderPath = folderPath.slice(0, existingIndex + 1);
    } else {
      // Add new folder to the path
      folderPath.push({ id: folderId, name: folderName });
    }
  }
  currentFolder.name = folderName;
  // Update UI
  updateBreadcrumbs();
  fetchFilesAndFolders(folderId);
}

function updateBreadcrumbs() {
  const breadcrumbs = document.getElementById("breadcrumbs");
  breadcrumbs.innerHTML = ""; // Clear previous breadcrumbs

  // Add Home as the first breadcrumb
  const homeLi = document.createElement("li");
  homeLi.className = "nav-home";
  homeLi.innerHTML = `<a href="#" onclick="navigateToFolder(null, 'Home')">
                          <i class="icon-home"></i>
                      </a>`;
  breadcrumbs.appendChild(homeLi);

  // Loop through folderPath to create breadcrumbs
  folderPath.forEach((folder, index) => {
    const separator = document.createElement("li");
    separator.className = "separator";
    separator.innerHTML = '<i class="icon-arrow-right"></i>';
    breadcrumbs.appendChild(separator);

    const li = document.createElement("li");
    li.className = "nav-item op-7 mb-2";

    if (index === folderPath.length - 1) {
      // Last item (current folder) - not clickable
      li.textContent = folder.name;
    } else {
      // Clickable breadcrumb items
      li.innerHTML = `<a href="#" onclick="navigateToFolder(${folder.id}, '${folder.name}')">${folder.name}</a>`;
    }

    breadcrumbs.appendChild(li);
  });
}

function handleFolderClick(folderId, folderName) {
  navigateToFolder(folderId, folderName);
}

function downloadFile(fileId) {
  const downloadUrl = `/download-file/${fileId}/`;

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.setAttribute("download", ""); // Ensures it downloads, not opens
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function viewFile(fileId) {
  // Create the URL to the file (using Django view to serve the file)
  const viewUrl = `/view-file/${fileId}/`; // The URL to download or open the file

  // Create an anchor element to trigger the file open
  const a = document.createElement("a");
  a.href = viewUrl;
  a.setAttribute("target", "_blank"); // Open in a new tab, or default app on the device
  document.body.appendChild(a); // Append to the DOM
  a.click(); // Trigger the file to open

  // Clean up by removing the element
  document.body.removeChild(a);
}

let selectedFileId = null;
// Function to open the modal
function openCustomModal(fileId) {
  selectedFileId = fileId;

  const overlay = document.getElementById("customModalOverlay");
  overlay.classList.add("active");
}

// Function to close the modal
function closeCustomModal() {
  const overlay = document.getElementById("customModalOverlay");
  overlay.classList.remove("active");
}

// Close modal when clicking outside the modal card
window.onclick = function (event) {
  const overlay = document.getElementById("customModalOverlay");
  if (event.target === overlay) {
    closeCustomModal();
  }
};

function sendEmail() {
  const email = document.getElementById("email").value;
  const message = document.getElementById("message").value;

  if (!email || !message || !selectedFileId) {
    alert("Please provide email, message, and select a file.");
    return;
  }

  const data = {
    email: email,
    message: message,
    fileId: selectedFileId, // Ensure it matches the backend
  };

  fetch("/send-email/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"), // CSRF token for security
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Unknown error");
        });
      }
      return response.json();
    })
    .then((data) => {
      alert("Email sent successfully!");
      closeCustomModal(); // Close the modal
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error sending email: " + error.message);
    });
}

function getCookie(name) {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

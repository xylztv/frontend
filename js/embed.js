document.querySelector(".embed_close").addEventListener("click", function() {
    this.closest(".embed").style.display = "none";
});

const videoContainer = document.createElement("div");
videoContainer.style.position = "fixed";
videoContainer.style.bottom = "20px";
videoContainer.style.right = "20px";
videoContainer.innerHTML = `
    <div style="position: relative;">
        <iframe
            width="320"
            height="180"
            src="https://www.youtube.com/embed/DwZOHNLe3dA"
            title="YouTube Video"
            frameborder="0"
            allowfullscreen
        ></iframe>
        <button type="button" class="close" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
`;

// Create the close button
const closeButton = videoContainer.querySelector(".close");

// Add custom styles to the close button for better visibility
closeButton.style.position = "absolute";
closeButton.style.top = "5px";
closeButton.style.right = "5px";
closeButton.style.fontSize = "24px";
closeButton.style.fontWeight = "bold";
closeButton.style.color = "#fff";
closeButton.style.backgroundColor = "#000";
closeButton.style.border = "none";
closeButton.style.padding = "6px 10px";
closeButton.style.borderRadius = "50%";
closeButton.style.opacity = "0.8";
closeButton.style.cursor = "pointer";

// Add event listener to hide the video container when the close button is clicked
closeButton.addEventListener("click", function() {
    videoContainer.style.display = "none";
});

document.body.appendChild(videoContainer);

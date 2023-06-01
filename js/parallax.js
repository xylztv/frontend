
function UpdateParallax() {
    let windowHeight = $(window).height()
    let bodyHeight = $("body").height()
    let top = window.scrollY
    let layers = document.getElementsByClassName("parallax-layer")
    let layer

    for (let i = 0; i < layers.length; i++) {
        layer = layers[i]
        let parallaxHeight = $(layer).height()
        if (parallaxHeight <= windowHeight || parallaxHeight == bodyHeight) {
            layer.setAttribute('style', `height: 100%`)
        } else {
            let maxScrollY = bodyHeight - windowHeight
            let runway = parallaxHeight - bodyHeight
            let finalY = (top / maxScrollY) * runway
            layer.setAttribute('style', 'transform: translate3d(0px, ' + -finalY + 'px, 0px)')
        }
    }
}

function SetupParallax() {window.addEventListener("scroll", UpdateParallax)}

$(document).ready(function() {
    SetupParallax()
    UpdateParallax()
})

let done = false;

let red_color = "#FF6E69";
let green_color = "#8EFF7C";

function clicked(id) {
    done = !done;
    id.style.backgroundColor = done ? green_color : red_color;
    id.style.backgroundColor.ho = done ? green_color : red_color;
    let cname = "username";
    let info = {"done": done, "username": getCookie(cname)};
    let callback="user_card_update";
    console.log("clicked", JSON.stringify(info), getCookie("course"), callback);
    socket.emit(callback, {data: JSON.stringify(info), room:getCookie("course")})
}

function reset() {
    console.log("Received RESET");
    done = false;
    document.getElementById("myBtn").style.backgroundColor = red_color;
}

function green() {
    console.log("Received RESET");
    done = true;
    document.getElementById("myBtn").style.backgroundColor = green_color;
}

socket.on('reset', reset);
socket.on('green', green);

socket.on('my_response', function (msg) {
    console.log("server_response", msg);
});
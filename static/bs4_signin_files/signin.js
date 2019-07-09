function addCourse(name) {
    if (document.getElementById(name)) {
        return
    }
    var selection = document.getElementById("courses_selection");
    var option = document.createElement("option");
    option.setAttribute('value', "name");
    option.setAttribute('id', name);
    option.appendChild(document.createTextNode(name));
    selection.appendChild(option);
}

function removeCourse(name) {
    var selection = document.getElementById("courses_selection");
    var option = document.getElementById(name);
    selection.removeChild(option);
}

socket.on('add_course', function (msg) {
    console.log("Adding Course updates:", msg);
    addCourse(JSON.parse(msg["data"]));
});

socket.on('remove_course', function (msg) {
    console.log("Removing Course:", msg);
    removeCourse(JSON.parse(msg["data"]));
});
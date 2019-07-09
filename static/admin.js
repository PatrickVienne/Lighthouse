function sortList(ul){
    var new_ul = ul.cloneNode(false);

    // Add all lis to an array
    var lis = [];
    for(var i = ul.childNodes.length; i--;){
        if(ul.childNodes[i].nodeName === 'LI')
            lis.push(ul.childNodes[i]);
    }

    // Sort the lis in descending order
    lis.sort(function(a, b){
       const date_b = b.firstElementChild.innerText, date_a = a.firstElementChild.innerText;
        if (date_a === "") return 1;
        if (date_b === "") return -1;
        if (date_a < date_b ) return -1;
        if (date_a > date_b ) return 1;
        return 0;
    });

    // Add them into the ul in order
    for(var i = 0; i < lis.length; i++)
        new_ul.appendChild(lis[i]);
    ul.parentNode.replaceChild(new_ul, ul);
}

function update_numbers(){
    var btn_red = document.getElementById("btn_red");
    var btn_green = document.getElementById("btn_green");
    var ul = document.getElementById("dynamic-list-group");

    var greens = 0, reds = 0;
    for(var i = ul.childNodes.length; i--;){
        if(ul.childNodes[i].nodeName === 'LI'){
            if (ul.childNodes[i].innerHTML == "Anonymous Participant"){
                reds++;
            } else {
                greens++;
            }

        }
    }

    btn_red.innerText = "All Red " + "(" + reds + ")";
    btn_green.innerText = "All Green " + "(" + greens + ")";
}

function addItem(name) {
    if (document.getElementById(name)) {
        return
    }
    var ul = document.getElementById("dynamic-list-group");
    var li = document.createElement("li");
    li.setAttribute('class', "list-group-item d-flex justify-content-between align-items-center list-group-item-danger");
    li.setAttribute('id', name);
    li.appendChild(document.createTextNode(name));
    var span = document.createElement("span");
    span.setAttribute('class', "badge badge-primary badge-pill");
    span.appendChild(document.createTextNode(new Date().toLocaleTimeString()));

    li.appendChild(span);
    ul.appendChild(li);
}

function removeItem(name) {
    var ul = document.getElementById("dynamic-list-group");
    var li = document.getElementById(name);
    ul.removeChild(li);
}


function addCard(name) {
    if (document.getElementById(name)) {
        return
    }
    var cardgroup = document.getElementById("dynamic-card-group");
    var card = document.createElement("div");
    card.setAttribute('class', "col-sm card bg-danger");
    card.setAttribute('id', name);
    var cardbody = document.createElement("div");
    cardbody.setAttribute('class', "card-body text-center");
    var cardbodytext = document.createElement("p");
    cardbodytext.setAttribute('class', "card-text");
    cardbodytext.appendChild(document.createTextNode(name));

    cardbody.appendChild(cardbodytext);
    card.appendChild(cardbody);
    cardgroup.appendChild(card);
}

function broadcast_red(){
    console.log("broadcast reset to all");
    socket.emit('reset_all', {data: "reset_all", room:getCookie("course")});
    var ul = document.getElementById("dynamic-list-group");
    var children = ul.children;
    for (var i = 0; i < children.length; i++) {
      var li = children[i];
      update_li_color(li.getAttribute("id"), false);
    }
}

function broadcast_green(){
    console.log("broadcast green to all");
    socket.emit('green_all', {data: "green_all", room:getCookie("course")});
    var ul = document.getElementById("dynamic-list-group");
    var children = ul.children;
    for (var i = 0; i < children.length; i++) {
      var li = children[i];
      update_li_color(li.getAttribute("id"), true);
    }
}

function removeCard(name) {
    var cardgroup = document.getElementById("dynamic-card-group");
    var card = document.getElementById(name);
    cardgroup.removeChild(card);
}

function update_li_color_by_element(li, done){
    const color_class = done ? "list-group-item-success" : "list-group-item-danger";
    li.setAttribute('class', `list-group-item d-flex justify-content-between align-items-center ${color_class}`);
    li.innerText = done ? li.id: "Anonymous Participant";
}

function update_li_timepill_by_element(li, timestring){
    var span = li.firstElementChild;
    if (span){
        span.innerText = timestring;
    }
}


function update_li_color(name, done){
    const li = document.getElementById(name);
    update_li_color_by_element(li, done);
    update_li_timepill_by_element(li, done?new Date().toLocaleTimeString():"")
    update_numbers();
}

function update_card(msg) {
    console.log("update card:", msg);
    const name = msg["username"];
    if (name==""){return}
    const done = msg["done"];
    if (!document.getElementById(name)) {
        addItem(msg["username"]);
    }

    const li = document.getElementById(name);
    const li_class = li.getAttribute("class");

    const color_class = done ? "list-group-item-success" : "list-group-item-danger";
    var to_be_updated = !li_class.includes(color_class);
    console.log("Checking for update necessity:");
    console.log(li, color_class, to_be_updated);
    if (to_be_updated){
        update_li_color(msg["username"], msg["done"]);
        const ul = document.getElementById("dynamic-list-group");
        sortList(ul);
    }
}

function update_cards(msg) {
    for (var name in msg) {
        if (name==""){continue;}
        update_card({username: name, done: msg[name]});
    }
    update_numbers();
}

function delete_card(name) {
    console.log("remove card:", name);
    if (document.getElementById(name)) {
        removeItem(name);
    }
    update_numbers();
}

$(document).ready(function () {
    // Use a "/test" namespace.
    // An application can open a connection on multiple namespaces, and
    // Socket.IO will multiplex all those connections on a single
    // physical channel. If you don't care about multiple channels, you
    // can set the namespace to an empty string.
    namespace = '/test';
    // Connect to the Socket.IO server.
    // The connection URL has the following format:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);
    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on('connect', function () {
        socket.emit('my_event', {data: 'I\'m connected!'});
    });
    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the "Received"
    // section of the page.
    socket.on('my_response', function (msg) {
        console.log("server_response", msg);
    });

    socket.on('all_cards_update', function (msg) {
        console.log("Received all cards update:", msg);
        update_cards(JSON.parse(msg["data"]));
    });

    socket.on('single_card_update', function (msg) {
        console.log("Received single card update:", msg);
        update_card(JSON.parse(msg["data"]));
    });

    socket.on('delete_user_card', function (msg) {
        console.log("Delete disconnected user card:", msg);
        delete_card(msg["data"]);
    });

    // Interval function that tests message latency by sending a "ping"
    // message. The server then responds with a "pong" message and the
    // round trip time is measured.
    var ping_pong_times = [];
    var start_time;
    // window.setInterval(function () {
    //     start_time = (new Date).getTime();
    //     socket.emit('my_ping');
    // }, 1000);
    // Handler for the "pong" message. When the pong is received, the
    // time from the ping is stored, and the average of the last 30
    // samples is average and displayed.
    // socket.on('my_pong', function () {
    //     var latency = (new Date).getTime() - start_time;
    //     ping_pong_times.push(latency);
    //     ping_pong_times = ping_pong_times.slice(-30); // keep last 30 samples
    //     var sum = 0;
    //     for (var i = 0; i < ping_pong_times.length; i++)
    //         sum += ping_pong_times[i];
    //     $('#ping-pong').text(Math.round(10 * sum / ping_pong_times.length) / 10);
    // });
    // Handlers for the different forms in the page.
    // These accept data from the user and send it to the server in a
    // variety of ways
    $('form#emit').submit(function (event) {
        socket.emit('my_event', {data: $('#emit_data').val()});
        return false;
    });
    $('form#broadcast').submit(function (event) {
        socket.emit('my_broadcast_event', {data: $('#broadcast_data').val()});
        return false;
    });
    $('form#join').submit(function (event) {
        socket.emit('join', {room: $('#join_room').val()});
        return false;
    });
    $('form#leave').submit(function (event) {
        socket.emit('leave', {room: $('#leave_room').val()});
        return false;
    });
    $('form#send_room').submit(function (event) {
        socket.emit('my_room_event', {room: $('#room_name').val(), data: $('#room_data').val()});
        return false;
    });
    $('form#close').submit(function (event) {
        socket.emit('close_room', {room: $('#close_room').val()});
        return false;
    });
    $('form#disconnect').submit(function (event) {
        socket.emit('disconnect_request');
        return false;
    });
});

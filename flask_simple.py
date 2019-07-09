#!/usr/bin/env python
import json
import os
from threading import Lock
from flask import Flask, render_template, session, request, make_response, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect
import requests
import collections
# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode, engineio_logger=True, logger=True)
thread = None
thread_lock = Lock()

USERS = collections.defaultdict(dict)
COURSES = ["Web Development 1 (2018-June)",
           "Python 1 (2018-July)",
           "Coding Weekend (2018-July)",
           "Hacking & Internet Security (2018-July)",
           "Playground"]

def background_thread():
    """Example of how to send server generated events to clients."""
    global USERS
    count = 0
    while True:
        socketio.sleep(3)
        count += 1
        for course in USERS:
            #print("SENDING: {}: {}".format(course,json.dumps(USERS[course])))
            socketio.emit('all_cards_update',
                          {'data': json.dumps(USERS[course]), 'count': count},
                          room=course, namespace='/test')

def create_course(course_name):
    print("Create Course", course_name)
    COURSES.append(course_name)
    if course_name not in USERS:
        print("Add Course to USERS table", course_name)
        USERS[course_name]={}
    socketio.emit('add_course', {'data': json.dumps(course_name)}, namespace='/login')

@app.route('/adminlogin', methods=["GET", "POST"])
def adminlogin():
    if request.method == 'POST':
        username = request.form.get('username')
        #course_name = request.form.get('course_name')
        course_selection = request.form.get('course_selection')
        if not username or not course_selection:
            return redirect("adminlogin")
        print("Login with: ", username, course_selection)
        #if not username or (not (bool(course_name)^bool(course_selection))):
        #course = course_name or course_selection
        try:
            course = json.loads(course_selection)
        except json.decoder.JSONDecodeError:
            course = course_selection
            print(course, "was not a json string [admin login]")
        if course not in COURSES:
            create_course(course)
        resp = make_response(redirect('admin'))
        resp.set_cookie('username', username)
        resp.set_cookie('course', course)
        resp.set_cookie('admin', "1")
        return resp
    else:
        return render_template('bs4_signin.html', async_mode=socketio.async_mode, courses=COURSES, admin=True)


@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        course_selection = request.form.get('course_selection')
        print("Login with: ", username, course_selection)
        if not username or not course_selection:
            return redirect("login")
        try:
            course_selection = json.loads(course_selection)
        except json.decoder.JSONDecodeError:
            print(course_selection, "was not json string [user login]")
        resp = make_response(redirect('/'))
        resp.set_cookie('username', username)
        resp.set_cookie('course', course_selection)
        resp.set_cookie('admin', "0")
        return resp
    else:
        return render_template('bs4_signin.html', async_mode=socketio.async_mode, courses=COURSES, admin=False)

@app.route('/admin')
def admin():
    username = request.cookies.get('username')
    admin = request.cookies.get('admin')
    if not username or not admin:
        return redirect(url_for('adminlogin'))
    print(USERS)
    return render_template('admin.html', async_mode=socketio.async_mode)

@app.route('/')
def index():
    username = request.cookies.get('username')
    course = request.cookies.get('course')
    if not username or not course:
        return redirect(url_for('login'))
    if username not in USERS[course]:
        USERS[course][username] = False
    print(USERS)
    return render_template('users.html', async_mode=socketio.async_mode, items=USERS)


@socketio.on('my_event', namespace='/test')
def test_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']})


@socketio.on('user_card_update', namespace='/test')
def test_broadcast_message(message):
    print("user_card_update")
    print("="*20)
    print(request.cookies)
    data = json.loads(message['data'])
    room_data = message.get("room", request.cookies.get('course'))
    try:
        room = json.loads(room_data)
    except json.decoder.JSONDecodeError:
        room = room_data
        print(room, "was not string [on user update]")
        if room == "":
            print("room was", room, ", skip...")
            return
    print("DATA:", data)
    print("ROOM:", room)
    if not data["username"]:
        print("username was", data["username"], ", skip...")
        return
    USERS[room][data["username"]] = data["done"]
    print(USERS)
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('single_card_update',
         {'data': message['data'], 'count': session['receive_count']},
         room=room)

@socketio.on('reset_all', namespace='/test')
def test_broadcast_reset(message):
    room = message["room"]
    room = json.loads(room)
    print("Send reset to all",room,  USERS[room])
    for user in USERS[room]:
        USERS[room][user] = False
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('reset',
         room=room)

@socketio.on('green_all', namespace='/test')
def test_broadcast_reset(message):
    room = message["room"]
    room = json.loads(room)
    print("Send green to all",room,  USERS[room])
    for user in USERS[room]:
        USERS[room][user] = True
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('green',
         room=room)


@socketio.on('join', namespace='/test')
def join(message):
    try:
        room = json.loads(message["room"])
    except:
        room = message["room"]
    join_room(room)
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})


@socketio.on('leave', namespace='/test')
def leave(message):
    room = json.loads(message["room"])
    leave_room(room)
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})


@socketio.on('close_room', namespace='/test')
def close(message):
    room = json.loads(message["room"])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'Room ' + room + ' is closing.',
                         'count': session['receive_count']},
         room=room)
    close_room(room)


@socketio.on('my_room_event', namespace='/test')
def send_room_message(message):
    room = json.loads(message["room"])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']},
         room=room)


@socketio.on('disconnect_request', namespace='/test')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()


# @socketio.on('my_ping', namespace='/test')
# def ping_pong():
#     emit('my_pong')


@socketio.on('connect', namespace='/test')
def test_connect():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(target=background_thread)
    emit('my_response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    if "username" in request.cookies and request.cookies["username"] in USERS[request.cookies["course"]]:
        print("USERS")
        del USERS[request.cookies["course"]][request.cookies["username"]]
        print("USERS")
    emit("delete_user_card", {"data": request.cookies["username"]}, broadcast=True)
    print('Client disconnected', request.sid)


if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), debug=True)

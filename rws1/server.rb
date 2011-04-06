require "rubygems"
require "bundler"
Bundler.setup
require "em-websocket"
require "ruby-debug"

class Client
  attr_accessor :websocket
  attr_accessor :name

  def initialize(websocket_arg)
    @websocket = websocket_arg
  end
end

class ChatRoom
  MaxNameLength = 15

  attr_accessor :clients

  def initialize
    @clients = {}
  end

  def start(opts={})
    EventMachine::WebSocket.start(opts) do |websocket|
      websocket.onopen    { add_client(websocket) }
      websocket.onmessage { |msg| handle_message(websocket, msg) }
      websocket.onclose   { remove_client(websocket) }
    end
  end

  def add_client(websocket)
    client = Client.new(websocket)
    client.name = assign_name(websocket.request["Query"]["name"])
    send_all "e" + client.name                   # Alert other clients.
    @clients[websocket] = client
    websocket.send "n" + client.name             # Tell client what its assigned name is.
    websocket.send "s" + client_names.join(",")  # Tell client who is in the room.
  end

  def remove_client(websocket)
    client = @clients.delete(websocket)
    send_all "l" + client.name      # Alert other clients.
  end

  # Sends a message (UTF-8 websocket frame) to all clients.
  def send_all(message)
    @clients.each do |websocket, client|
      websocket.send message
    end
    puts "send_all: #{message}"
  end

  # Handle a message (UTF-8 websocket frame) received from a websocket.
  def handle_message(websocket, message)
    return if message == ""
    command, data = "command_#{message[0]}", message[1..-1]
    if respond_to?(command)
      send(command, websocket, data)
    end
  end

  # This is called when we receive a message beginning with "c".
  # These messages are chat messages, so we send them to all clients.
  def command_c(websocket, chat_message)
    send_all "c#{@clients[websocket].name}: #{chat_message}"
  end

  def client_names
    @clients.collect{|websocket, c| c.name}.sort
  end

  def sanitize_user_name(raw_name)
    name = raw_name.to_s.scan(/[[:alnum:]]/).join[0,MaxNameLength]
    name.empty? ? "Guest" : name
  end

  def assign_name(requested_name)
    name = sanitize_user_name(requested_name)
    existing_names = self.client_names
    if existing_names.include?(name)
      i = 2
      while existing_names.include?(name + i.to_s)
        i += 1
      end
      name += i.to_s
    end
    return name
  end
end

chatroom = ChatRoom.new
chatroom.start(host: "", port: 8080)

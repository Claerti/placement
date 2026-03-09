package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// allow any origin for development; tighten in production
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	// create and run hub (persist grid to disk)
	h := NewHub(50, "grid.json")
	go h.Run()

	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("upgrade error:", err)
			return
		}
		client := &Client{
			hub:  h,
			conn: conn,
			send: make(chan Move, 256),
		}
		h.register <- client
		go client.writePump()
		go client.readPump()
	})

	addr := ":8080"
	log.Println("listening on", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

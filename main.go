package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/claerti/placement/canvas"
	"github.com/claerti/placement/chat"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func main() {
	gridHeight := 100
	gridWidth := gridHeight * 2
	// create and run hub (persist grid to disk)
	h := canvas.NewHub(gridWidth, gridHeight, "canvas/grid.json")
	go h.Run()

	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{
			"width":  gridWidth,
			"height": gridHeight,
		})
	})

	http.Handle("/", http.FileServer(http.Dir("./static")))

	http.HandleFunc("/canvas", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("upgrade error:", err)
			return
		}
		client := &canvas.Client{
			Hub:  h,
			Conn: conn,
			Send: make(chan canvas.Move, 256),
		}
		h.Register <- client
		go client.WritePump()
		go client.ReadPump()
	})

	c := chat.NewHub()
	go c.Run()

	http.HandleFunc("/chat", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("upgrade error:", err)
			return
		}
		client := &chat.Client{
			Hub:  c,
			Conn: conn,
			Send: make(chan chat.Message, 256),
		}
		c.Register <- client
		go client.WritePump()
		go client.ReadPump()
	})

	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}
	addr = ":" + addr
	log.Println("listening on port", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

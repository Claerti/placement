package chat

import (
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

func (h *Hub) RegisterClient(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) unregisterClient(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

func (h *Hub) Run() {
	for {
		select {
		case newClient := <-h.Register:
			h.RegisterClient(newClient)
		case oldClient := <-h.Unregister:
			h.unregisterClient(oldClient)
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// drop slow receiver
				}
			}
		}
	}
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

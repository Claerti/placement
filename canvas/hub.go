package canvas

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Move
	Register   chan *Client
	unregister chan *Client
	width      int
	height     int
	grid       [][]int
	mu         sync.Mutex
	filePath   string // where grid is persisted
}

func (h *Hub) RegisterClient(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
	c.Send <- Move{FullGrid: h.grid}
}

func (h *Hub) unregisterClient(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

func (h *Hub) updatePixel(m Move) error {
	if m.X < 0 || m.X >= h.width || m.Y < 0 || m.Y >= h.height {
		return fmt.Errorf("Move is out of bounds: %v", m)
	}
	h.mu.Lock()
	h.grid[m.X][m.Y] = m.Color
	h.mu.Unlock()
	return nil
}

func (h *Hub) Run() {
	for {
		select {
		case newClient := <-h.Register:
			h.RegisterClient(newClient)
		case oldClient := <-h.unregister:
			h.unregisterClient(oldClient)
		case move := <-h.broadcast:
			if move.Reset {
				h.mu.Lock()
				h.grid = make([][]int, h.width)
				for i := range h.grid {
					h.grid[i] = make([]int, h.height)
				}
				h.mu.Unlock()
				h.saveGrid()
			} else {
				err := h.updatePixel(move)
				if err != nil {
					fmt.Println("Error updating pixel:", err)
				}
			}
			for client := range h.clients {
				select {
				case client.Send <- move:
				default:
					// drop slow receiver
				}
			}
		}
	}
}

func (h *Hub) loadGrid() error {
	if h.filePath == "" {
		return errors.New("No file path specified for grid.json")
	}
	f, err := os.Open(h.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // no previous file
		}
		return err
	}
	defer f.Close()
	if err := json.NewDecoder(f).Decode(&h.grid); err != nil {
		return err
	}
	// validate dimensions, otherwise reinitialize
	if len(h.grid) != h.width {
		h.grid = make([][]int, h.width)
		for i := range h.grid {
			h.grid[i] = make([]int, h.height)
		}
	}
	for i := range h.grid {
		if len(h.grid[i]) != h.height {
			h.grid[i] = make([]int, h.height)
		}
	}
	return nil
}

func (h *Hub) PeriodicSave() {
	for {
		<-time.After(1 * time.Minute)
		err := h.saveGrid()
		if err != nil {
			fmt.Println("Error saving grid:", err)
		}
	}
}

func (h *Hub) saveGrid() error {
	if h.filePath == "" {
		h.filePath = "grid.json" // default path
	}
	f, err := os.Create(h.filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "  ")
	return encoder.Encode(h.grid)
}

func NewHub(width int, height int, filePath string) *Hub {
	grid := make([][]int, width)
	for i := range grid {
		grid[i] = make([]int, height)
	}
	h := &Hub{
		clients:    make(map[*Client]bool),
		width:      width,
		height:     height,
		grid:       grid,
		broadcast:  make(chan Move),
		Register:   make(chan *Client),
		unregister: make(chan *Client),
		filePath:   filePath,
	}
	// attempt to load previous state
	h.loadGrid()
	go h.PeriodicSave()

	return h
}

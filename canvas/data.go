package canvas

type Move struct {
	X        int     `json:"x"`
	Y        int     `json:"y"`
	Color    int     `json:"color"`
	Reset    bool    `json:"reset"`
	FullGrid [][]int `json:"fullGrid,omitempty"` // optional field for sending the entire grid
}

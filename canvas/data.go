package canvas

type Move struct {
	X     int  `json:"x"`
	Y     int  `json:"y"`
	Color int  `json:"color"`
	Reset bool `json:"reset"`
}

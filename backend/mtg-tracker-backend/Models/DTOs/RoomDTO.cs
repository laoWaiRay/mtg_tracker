namespace Mtg_tracker.Models.DTOs;

public class RoomDTO
{
    public required int Id { get; set; }
    public required string RoomOwnerId { get; set; }
    public required string Code { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // A list of all players in the room
    public List<UserReadDTO> Players { get; set; } = null!;
}

public class AddPlayerDTO
{
    public required string Id { get; set; }
}
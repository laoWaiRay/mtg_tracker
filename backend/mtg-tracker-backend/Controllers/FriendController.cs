using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mtg_tracker.Models;
using Mtg_tracker.Models.DTOs;
using Mtg_tracker.Extensions;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using System.Data;

namespace Mtg_tracker.Controllers;

[Route("api/[controller]")]
[ApiController]
public class FriendController(MtgContext context, IMapper mapper) : ControllerBase
{
    private readonly MtgContext _context = context;
    private readonly IMapper _mapper = mapper;

    // GET: api/friend
    // Returns all friends of current user
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserReadDTO>>> GetFriends()
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var currentUser = await _context.Users
            .Include(u => u.Friends)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (currentUser is null)
        {
            return Unauthorized();
        }

        return _mapper.Map<List<UserReadDTO>>(currentUser.Friends);
    }

    // POST: api/friend
    // Adds a friend
    [Authorize]
    [HttpPost]
    public async Task<ActionResult> PostFriend(string friendId)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .Include(u => u.Friends)
            .Include(u => u.ReceivedFriendRequests)
            .FirstOrDefaultAsync(u => u.Id == userId);

        var friendUser = await _context.Users
            .Include(u => u.Friends)
            .FirstOrDefaultAsync(u => u.Id == friendId);

        if (user is null)
        {
            return Unauthorized();
        }
        if (friendUser is null)
        {
            return NotFound();
        }

        // A friend request must exist with current user as receiver to add friend
        var friendRequest = user.ReceivedFriendRequests.FirstOrDefault(fr =>
            fr.ReceiverId == userId && fr.SenderId == friendId);

        if (friendRequest is null)
        {
            return BadRequest();
        }

        // Add friend to Friends table and remove request from the Requests table
        user.Friends.Add(friendUser);
        friendUser.Friends.Add(user);
        _context.FriendRequests.Remove(friendRequest);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception e) when (
            e is DbUpdateConcurrencyException ||
            e is DbUpdateException)
        {
            return StatusCode(500, "Could not add friend");
        }

        return Ok();
    }

    // DELETE api/friend/{id}
    // Delete a friend
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFriend(string id)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .Include(u => u.Friends)
            .Include(u => u.SentFriendRequests)
            .Include(u => u.ReceivedFriendRequests)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return Unauthorized();
        }

        var friendUser = user.Friends.FirstOrDefault(fr => fr.Id == id);
        if (friendUser is null)
        {
            return NotFound();
        }

        var loadedFriendUser = await _context.Users
            .Include(u => u.Friends)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (loadedFriendUser is null)
        {
            return NotFound();
        }

        user.SentFriendRequests.RemoveAll(fr => fr.SenderId == userId);
        user.ReceivedFriendRequests.RemoveAll(fr => fr.ReceiverId == userId);
        user.Friends.Remove(friendUser);
        loadedFriendUser.Friends.Remove(user);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DBConcurrencyException)
        {
            return StatusCode(500, "Error removing friend");
        }

        return NoContent();
    }
}
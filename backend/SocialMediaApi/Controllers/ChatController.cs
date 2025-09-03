using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialMediaApi.Data;
using SocialMediaApi.DTOs;
using SocialMediaApi.Models;

namespace SocialMediaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        // Get all users for chat selection
        [HttpGet("users/{currentUserId}")]
        public async Task<IActionResult> GetChatUsers(int currentUserId)
        {
            try
            {
                var users = await _context.Users
                    .Where(u => u.Id != currentUserId)
                    .Select(u => new ChatUserDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        ProfileImage = u.ProfileImage
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching users" });
            }
        }

        // Get chat history between two users
        [HttpGet("history/{userId1}/{userId2}")]
        public async Task<IActionResult> GetChatHistory(int userId1, int userId2)
        {
            try
            {
                var messages = await _context.Chats
                    .Where(c => (c.SenderId == userId1 && c.ReceiverId == userId2) ||
                               (c.SenderId == userId2 && c.ReceiverId == userId1))
                    .Include(c => c.Sender)
                    .OrderBy(c => c.SentAt)
                    .Select(c => new ChatMessageDto
                    {
                        Id = c.Id,
                        SenderId = c.SenderId,
                        SenderName = c.Sender.Username,
                        ReceiverId = c.ReceiverId,
                        Message = c.Message,
                        SentAt = c.SentAt,
                        IsRead = c.IsRead
                    })
                    .ToListAsync();

                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching chat history" });
            }
        }

        // Get user's chat conversations
        [HttpGet("conversations/{userId}")]
        public async Task<IActionResult> GetUserConversations(int userId)
        {
            try
            {
                var conversations = await _context.ChatRooms
                    .Where(cr => cr.User1Id == userId || cr.User2Id == userId)
                    .Include(cr => cr.User1)
                    .Include(cr => cr.User2)
                    .OrderByDescending(cr => cr.LastMessageAt)
                    .Select(cr => new ConversationDto
                    {
                        ChatRoomId = cr.Id,
                        OtherUser = cr.User1Id == userId ? new ChatUserDto
                        {
                            Id = cr.User2.Id,
                            Username = cr.User2.Username,
                            ProfileImage = cr.User2.ProfileImage
                        } : new ChatUserDto
                        {
                            Id = cr.User1.Id,
                            Username = cr.User1.Username,
                            ProfileImage = cr.User1.ProfileImage
                        },
                        LastMessageAt = cr.LastMessageAt
                    })
                    .ToListAsync();

                // Get last message for each conversation
                foreach (var conv in conversations)
                {
                    var lastMessage = await _context.Chats
                        .Where(c => (c.SenderId == userId && c.ReceiverId == conv.OtherUser.Id) ||
                                   (c.SenderId == conv.OtherUser.Id && c.ReceiverId == userId))
                        .OrderByDescending(c => c.SentAt)
                        .FirstOrDefaultAsync();

                    if (lastMessage != null)
                    {
                        conv.LastMessage = lastMessage.Message;
                        conv.LastMessageSenderId = lastMessage.SenderId;
                    }

                    // Get unread count
                    conv.UnreadCount = await _context.Chats
                        .CountAsync(c => c.SenderId == conv.OtherUser.Id && 
                                        c.ReceiverId == userId && !c.IsRead);
                }

                return Ok(conversations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching conversations" });
            }
        }

        // Send a message (fallback for non-SignalR clients)
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto messageDto)
        {
            try
            {
                var chat = new Chat
                {
                    SenderId = messageDto.SenderId,
                    ReceiverId = messageDto.ReceiverId,
                    Message = messageDto.Message,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.Chats.Add(chat);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, chatId = chat.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error sending message" });
            }
        }

        // Get unread message count for a user
        [HttpGet("unread-count/{userId}")]
        public async Task<IActionResult> GetUnreadMessageCount(int userId)
        {
            try
            {
                var unreadCount = await _context.Chats
                    .CountAsync(c => c.ReceiverId == userId && !c.IsRead);

                return Ok(unreadCount);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching unread count" });
            }
        }
    }
}

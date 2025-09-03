namespace SocialMediaApi.DTOs
{
    public class CreatePostDto
    {
        public int UserId { get; set; }
        public string Caption { get; set; } = string.Empty;
        public IFormFile? Image { get; set; }
    }

    public class PostDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Caption { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public DateTime PostedAt { get; set; }
        public string Username { get; set; } = string.Empty;
        public int LikesCount { get; set; }
    }

    public class PostResponseDto
    {
        public int Id { get; set; }
        public string Caption { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int LikesCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserDto User { get; set; } = null!;
        public List<CommentDto> Comments { get; set; } = new List<CommentDto>();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
    }

    public class CommentDto
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime CommentedAt { get; set; }
        public string Username { get; set; } = string.Empty;
    }

    public class CreateCommentDto
    {
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Text { get; set; } = string.Empty;
    }

    public class CreateUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LikePostDto
    {
        public int UserId { get; set; }
    }

    // Authentication DTOs
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class SignupDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    // Chat DTOs
    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public int ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
    }

    public class ChatUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImage { get; set; }
    }

    public class ConversationDto
    {
        public int ChatRoomId { get; set; }
        public ChatUserDto OtherUser { get; set; } = null!;
        public string? LastMessage { get; set; }
        public int? LastMessageSenderId { get; set; }
        public DateTime LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }

    public class SendMessageDto
    {
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // Product DTOs
    public class CreateProductDto
    {
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? Price { get; set; }
        public IFormFile? Image { get; set; }
    }

    public class ProductDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? Price { get; set; }
        public string? ImagePath { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Username { get; set; } = string.Empty;
    }

    // Order DTOs
    public class CreateOrderDto
    {
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public string ProductTitle { get; set; } = string.Empty;
        public decimal ProductPrice { get; set; }
        public int Quantity { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string? Phone { get; set; }
    }

    public class OrderDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int ProductId { get; set; }
        public string ProductTitle { get; set; } = string.Empty;
        public decimal ProductPrice { get; set; }
        public int Quantity { get; set; }
        public decimal TotalAmount { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string OrderStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}

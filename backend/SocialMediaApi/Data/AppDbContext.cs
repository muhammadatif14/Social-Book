using Microsoft.EntityFrameworkCore;
using SocialMediaApi.Models;

namespace SocialMediaApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Like> Likes { get; set; }
        public DbSet<Chat> Chats { get; set; }
        public DbSet<ChatRoom> ChatRooms { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Order> Orders { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ProfileImage).HasMaxLength(500);
            });

            // Post configuration
            modelBuilder.Entity<Post>(entity =>
            {
                entity.ToTable("Posts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Caption).IsRequired().HasColumnType("nvarchar(max)");
                entity.Property(e => e.ImagePath).HasMaxLength(500);
                
                entity.HasOne(d => d.User)
                    .WithMany(p => p.Posts)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Comment configuration
            modelBuilder.Entity<Comment>(entity =>
            {
                entity.ToTable("Comments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Text).IsRequired().HasColumnType("nvarchar(max)");
                
                entity.HasOne(d => d.Post)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.PostId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(d => d.User)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Like configuration
            modelBuilder.Entity<Like>(entity =>
            {
                entity.ToTable("Likes");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
                
                entity.HasOne(d => d.Post)
                    .WithMany(p => p.Likes)
                    .HasForeignKey(d => d.PostId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(d => d.User)
                    .WithMany(p => p.Likes)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Chat configuration
            modelBuilder.Entity<Chat>(entity =>
            {
                entity.ToTable("Chats");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
                
                entity.HasOne(d => d.Sender)
                    .WithMany()
                    .HasForeignKey(d => d.SenderId)
                    .OnDelete(DeleteBehavior.NoAction);
                
                entity.HasOne(d => d.Receiver)
                    .WithMany()
                    .HasForeignKey(d => d.ReceiverId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ChatRoom configuration
            modelBuilder.Entity<ChatRoom>(entity =>
            {
                entity.ToTable("ChatRooms");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.User1Id, e.User2Id }).IsUnique();
                
                entity.HasOne(d => d.User1)
                    .WithMany()
                    .HasForeignKey(d => d.User1Id)
                    .OnDelete(DeleteBehavior.NoAction);
                
                entity.HasOne(d => d.User2)
                    .WithMany()
                    .HasForeignKey(d => d.User2Id)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Product configuration
            modelBuilder.Entity<Product>(entity =>
            {
                entity.ToTable("Products");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.ImagePath).HasMaxLength(500);
                entity.Property(e => e.Price).HasColumnType("decimal(18,2)");

                entity.HasOne(d => d.User)
                    .WithMany()
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Order configuration
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("Orders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProductTitle).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ProductPrice).HasColumnType("decimal(10,2)");
                entity.Property(e => e.TotalAmount).HasColumnType("decimal(10,2)");
                entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CustomerEmail).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ShippingAddress).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.OrderStatus).IsRequired().HasMaxLength(50);

                entity.HasOne(d => d.User)
                    .WithMany()
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}

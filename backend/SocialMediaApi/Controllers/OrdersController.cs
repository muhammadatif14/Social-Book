using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialMediaApi.Data;
using SocialMediaApi.DTOs;
using SocialMediaApi.Models;

namespace SocialMediaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<OrderDto>> CreateOrder(CreateOrderDto createOrderDto)
        {
            try
            {
                // Validate that the user exists
                var userExists = await _context.Users.AnyAsync(u => u.Id == createOrderDto.UserId);
                if (!userExists)
                {
                    return BadRequest($"User with ID {createOrderDto.UserId} does not exist.");
                }

                // Calculate total amount
                var totalAmount = createOrderDto.ProductPrice * createOrderDto.Quantity;

                var order = new Order
                {
                    UserId = createOrderDto.UserId,
                    ProductId = createOrderDto.ProductId,
                    ProductTitle = createOrderDto.ProductTitle,
                    ProductPrice = createOrderDto.ProductPrice,
                    Quantity = createOrderDto.Quantity,
                    TotalAmount = totalAmount,
                    CustomerName = createOrderDto.CustomerName,
                    CustomerEmail = createOrderDto.CustomerEmail,
                    ShippingAddress = createOrderDto.ShippingAddress,
                    Phone = createOrderDto.Phone,
                    OrderStatus = "Confirmed",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                var orderDto = new OrderDto
                {
                    Id = order.Id,
                    UserId = order.UserId,
                    ProductId = order.ProductId,
                    ProductTitle = order.ProductTitle,
                    ProductPrice = order.ProductPrice,
                    Quantity = order.Quantity,
                    TotalAmount = order.TotalAmount,
                    CustomerName = order.CustomerName,
                    CustomerEmail = order.CustomerEmail,
                    ShippingAddress = order.ShippingAddress,
                    Phone = order.Phone,
                    OrderStatus = order.OrderStatus,
                    CreatedAt = order.CreatedAt,
                    UpdatedAt = order.UpdatedAt
                };

                return Ok(orderDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating order: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { success = false, message = "An error occurred while creating the order", error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<OrderDto>>> GetUserOrders(int userId)
        {
            try
            {
                var orders = await _context.Orders
                    .Where(o => o.UserId == userId)
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => new OrderDto
                    {
                        Id = o.Id,
                        UserId = o.UserId,
                        ProductId = o.ProductId,
                        ProductTitle = o.ProductTitle,
                        ProductPrice = o.ProductPrice,
                        Quantity = o.Quantity,
                        TotalAmount = o.TotalAmount,
                        CustomerName = o.CustomerName,
                        CustomerEmail = o.CustomerEmail,
                        ShippingAddress = o.ShippingAddress,
                        Phone = o.Phone,
                        OrderStatus = o.OrderStatus,
                        CreatedAt = o.CreatedAt,
                        UpdatedAt = o.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching orders", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDto>> GetOrder(int id)
        {
            try
            {
                var order = await _context.Orders
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (order == null)
                {
                    return NotFound(new { success = false, message = "Order not found" });
                }

                var orderDto = new OrderDto
                {
                    Id = order.Id,
                    UserId = order.UserId,
                    ProductId = order.ProductId,
                    ProductTitle = order.ProductTitle,
                    ProductPrice = order.ProductPrice,
                    Quantity = order.Quantity,
                    TotalAmount = order.TotalAmount,
                    CustomerName = order.CustomerName,
                    CustomerEmail = order.CustomerEmail,
                    ShippingAddress = order.ShippingAddress,
                    Phone = order.Phone,
                    OrderStatus = order.OrderStatus,
                    CreatedAt = order.CreatedAt,
                    UpdatedAt = order.UpdatedAt
                };

                return Ok(orderDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching the order", error = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult<OrderDto>> UpdateOrderStatus(int id, [FromBody] string status)
        {
            try
            {
                var order = await _context.Orders.FindAsync(id);
                if (order == null)
                {
                    return NotFound(new { success = false, message = "Order not found" });
                }

                order.OrderStatus = status;
                order.UpdatedAt = DateTime.UtcNow;

                _context.Orders.Update(order);
                await _context.SaveChangesAsync();

                var orderDto = new OrderDto
                {
                    Id = order.Id,
                    UserId = order.UserId,
                    ProductId = order.ProductId,
                    ProductTitle = order.ProductTitle,
                    ProductPrice = order.ProductPrice,
                    Quantity = order.Quantity,
                    TotalAmount = order.TotalAmount,
                    CustomerName = order.CustomerName,
                    CustomerEmail = order.CustomerEmail,
                    ShippingAddress = order.ShippingAddress,
                    Phone = order.Phone,
                    OrderStatus = order.OrderStatus,
                    CreatedAt = order.CreatedAt,
                    UpdatedAt = order.UpdatedAt
                };

                return Ok(orderDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while updating the order", error = ex.Message });
            }
        }
    }
}

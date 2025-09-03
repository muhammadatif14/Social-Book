-- Create Orders table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
BEGIN
    CREATE TABLE Orders (
        Id int IDENTITY(1,1) PRIMARY KEY,
        UserId int NOT NULL,
        ProductId int NOT NULL,
        ProductTitle nvarchar(255) NOT NULL,
        ProductPrice decimal(10,2) NOT NULL,
        Quantity int NOT NULL,
        TotalAmount decimal(10,2) NOT NULL,
        CustomerName nvarchar(100) NOT NULL,
        CustomerEmail nvarchar(255) NOT NULL,
        ShippingAddress nvarchar(500) NOT NULL,
        Phone nvarchar(20) NULL,
        OrderStatus nvarchar(50) NOT NULL DEFAULT 'Pending',
        CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt datetime2 NULL,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    )
    
    PRINT 'Orders table created successfully'
END
ELSE
BEGIN
    PRINT 'Orders table already exists'
END

-- Script to delete test users and all their associated data
-- Execute in the correct order to respect foreign key constraints

USE socialBook;

-- Test users to delete: IDs 1, 2, 3, 4, 5 (testuser, testuser, abc, xyz, asd)

PRINT 'Starting deletion of test users and their data...';

-- 1. Delete ALL likes on posts created by test users (regardless of who liked them)
PRINT 'Deleting all likes on posts by test users...';
DELETE FROM Likes WHERE PostId IN (SELECT Id FROM Posts WHERE UserId IN (1, 2, 3, 4, 5));
PRINT 'Likes on test user posts deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 2. Delete likes made by test users on any posts
PRINT 'Deleting likes made by test users...';
DELETE FROM Likes WHERE UserId IN (1, 2, 3, 4, 5);
PRINT 'Likes by test users deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 3. Delete ALL comments on posts created by test users (regardless of who commented)
PRINT 'Deleting all comments on posts by test users...';
DELETE FROM Comments WHERE PostId IN (SELECT Id FROM Posts WHERE UserId IN (1, 2, 3, 4, 5));
PRINT 'Comments on test user posts deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 4. Delete comments made by test users on any posts
PRINT 'Deleting comments made by test users...';
DELETE FROM Comments WHERE UserId IN (1, 2, 3, 4, 5);
PRINT 'Comments by test users deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 5. Delete Chats (references Users as sender/receiver)
PRINT 'Deleting chats involving test users...';
DELETE FROM Chats WHERE SenderId IN (1, 2, 3, 4, 5) OR ReceiverId IN (1, 2, 3, 4, 5);
PRINT 'Chats deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 6. Delete ChatRooms (references Users)
PRINT 'Deleting chat rooms involving test users...';
DELETE FROM ChatRooms WHERE User1Id IN (1, 2, 3, 4, 5) OR User2Id IN (1, 2, 3, 4, 5);
PRINT 'Chat rooms deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 7. Delete Posts (references Users)
PRINT 'Deleting posts by test users...';
DELETE FROM Posts WHERE UserId IN (1, 2, 3, 4, 5);
PRINT 'Posts deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 8. Delete Products (if exists, references Users)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Products')
BEGIN
    PRINT 'Deleting products by test users...';
    DELETE FROM Products WHERE UserId IN (1, 2, 3, 4, 5);
    PRINT 'Products deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
END

-- 9. Finally, delete the Users themselves
PRINT 'Deleting test users...';
DELETE FROM Users WHERE Id IN (1, 2, 3, 4, 5);
PRINT 'Users deleted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

PRINT 'Test user deletion completed successfully!';

-- Verify deletion
PRINT 'Verification - remaining users:';
SELECT Id, Username, Email FROM Users ORDER BY Id;

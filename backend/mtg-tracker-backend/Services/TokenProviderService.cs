using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mtg_tracker.Models;

namespace Mtg_tracker.Services;

public class TokenProviderService(IConfiguration configuration, MtgContext context)
{
    private readonly MtgContext _context = context;

    public string CreateAccessToken(ApplicationUser user)
    {
        string secretKey = configuration["Jwt_Secret"]!;

        var claims = new[] {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new Claim("email_verified", user.EmailConfirmed.ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, 
                        DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), 
                        ClaimValueTypes.Integer64)
        };

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt_Issuer"],
            audience: configuration["Jwt_Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<RefreshToken> CreateRefreshToken(ApplicationUser user)
    {
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            Token = Guid.NewGuid().ToString(),
            IsRevoked = false,
        };

        _context.RefreshTokens.Add(refreshToken);

        // Remove expired and revoked refresh tokens
        var expiredOrRevokedTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && (rt.ExpiresAt < DateTime.UtcNow || rt.IsRevoked))
            .ToListAsync();

        if (expiredOrRevokedTokens.Count > 0)
        {
            _context.RefreshTokens.RemoveRange(expiredOrRevokedTokens);
        }

        await _context.SaveChangesAsync();

        return refreshToken;
    }

    public async Task<ApplicationUser?> ValidateRefreshToken(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .Where(rt => rt.Token == refreshToken && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();

        if (token == null)
        {
            return null;
        }

        var user = await _context.Users.FindAsync(token.UserId);
        if (user == null)
        {
            return null;
        }

        return user;
    }

    public async Task InvalidateRefreshToken(string token)
    {
        var rt = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token);
        if (rt != null)
        {
            rt.IsRevoked = true;
            await _context.SaveChangesAsync();
        }
    }
}
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using RegTech.Web.OtcLookup.Interfaces;

namespace RegTech.Web.OtcLookup.Services
{
    public class LogoutService : ILogoutService
    {
        private readonly ITokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LogoutService(ITokenService tokenService, IHttpContextAccessor httpContextAccessor)
        {
            _tokenService = tokenService;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task DoLogoutAsync(string username)
        {
            // Remove tokens and expiration from the cache
            await _tokenService.ClearTokenCache(username);

            // Sign out the user by clearing the cookie-based authentication
            await _httpContextAccessor.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // Clear the session
            _httpContextAccessor.HttpContext.Session.Clear();
        }
    }
}

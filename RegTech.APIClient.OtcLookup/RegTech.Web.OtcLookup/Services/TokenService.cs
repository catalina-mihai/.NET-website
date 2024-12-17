using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RegTech.Web.OtcLookup.Interfaces;
using RegTech.Web.OtcLookup.Options;
using RestSharp;
using System.Globalization;

namespace RegTech.Web.OtcLookup.Services
{
    public class TokenService : ITokenService
    {
        private readonly ILogger<TokenService> _logger;
        private readonly IDistributedCache _cache;
        private readonly ExternalApiOptions _apiOptions;


        private string AccessTokenKey(string username) => $"AccessToken_{username}";
        private string RefreshTokenKey(string username) => $"RefreshToken_{username}";
        private string TokenExpiryKey(string username) => $"TokenExpiry_{username}";

        public TokenService(ILogger<TokenService> logger, IDistributedCache cache, IOptions<ExternalApiOptions> apiOptions)
        {
            _apiOptions = apiOptions.Value;
            _logger = logger;
            _cache = cache;
        }

        public async Task<string> GetValidTokenAsync(string username)
        {
            var token = await _cache.GetStringAsync(AccessTokenKey(username));
            var expiryString = await _cache.GetStringAsync(TokenExpiryKey(username));

            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(expiryString) ||
                DateTime.Parse(expiryString, null, DateTimeStyles.AdjustToUniversal) <= DateTime.UtcNow.AddMinutes(5))
            {
                var refreshToken = await _cache.GetStringAsync(RefreshTokenKey(username));

                if (!string.IsNullOrWhiteSpace(refreshToken))
                    return await RefreshTokenAsync(username, refreshToken);

                await ClearTokenCache(username);
                
                return null;
            }

            return token;
        }

        private async Task<string> RefreshTokenAsync(string username, string refreshToken)
        {
            RestClient restClient = new RestClient(_apiOptions.BaseUrl);

            var request = new RestRequest("connect/token");
            request.AddParameter("grant_type", "refresh_token");
            request.AddParameter("client_id", _apiOptions.ClientId);
            request.AddParameter("client_secret", _apiOptions.ClientSecret);
            request.AddParameter("refresh_token", refreshToken);

            request.AddHeader("Content-Type", "application/x-www-form-urlencoded");

            RestResponse response = restClient.ExecutePostAsync(request).Result;

            if (!response.IsSuccessful)
                return null;

            var tokenData = JsonConvert.DeserializeObject<TokenResponse>(response.Content);

            await StoreTokenDataAsync(username, tokenData);
            return tokenData.AccessToken;
        }

        public async Task StoreTokenDataAsync(string username, TokenResponse tokenData)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(tokenData.ExpiresIn)
            };

            
            await _cache.SetStringAsync(AccessTokenKey(username), tokenData.AccessToken, options);
            await _cache.SetStringAsync(TokenExpiryKey(username), DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn).ToString("O"), options);

            if (!string.IsNullOrWhiteSpace(tokenData.RefreshToken))
                await _cache.SetStringAsync(RefreshTokenKey(username), tokenData.RefreshToken, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(86400) }); // 24 hours
        }

        public async Task ClearTokenCache(string username)
        {
            if (username != null)
            {
                // Clear the user's access and refresh tokens from the cache
                await _cache.RemoveAsync(AccessTokenKey(username));
                await _cache.RemoveAsync(RefreshTokenKey(username));
                await _cache.RemoveAsync(TokenExpiryKey(username));
            }
        }
    }
}

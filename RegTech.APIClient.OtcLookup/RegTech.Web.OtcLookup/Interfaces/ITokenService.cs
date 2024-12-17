using RegTech.Web.OtcLookup.Services;

namespace RegTech.Web.OtcLookup.Interfaces
{
    public interface ITokenService
    {
        /// <summary>
        /// Retrieves a valid token, refreshing it if necessary.
        /// </summary>
        Task<string> GetValidTokenAsync(string username);

        /// <summary>
        /// Stores token data in the cache.
        /// </summary>
        /// <param name="username">The username of the user that is logged in.</param>
        /// <param name="tokenData">The token response object containing token details.</param>
        Task StoreTokenDataAsync(string username, TokenResponse tokenData);

        /// <summary>
        /// Clears token data from the cache.
        /// </summary>
        /// <param name="username">The username of the user that is logged in.</param>
        Task ClearTokenCache(string username);
    }
}

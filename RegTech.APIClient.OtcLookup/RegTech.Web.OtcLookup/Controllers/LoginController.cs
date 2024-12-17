using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RegTech.Web.OtcLookup.Interfaces;
using RegTech.Web.OtcLookup.Options;
using RegTech.Web.OtcLookup.Services;
using RestSharp;
using System.Security.Claims;

namespace RegTech.Web.OtcLookup.Controllers
{
    public class LoginController : Controller
    {
        private readonly ExternalApiOptions _apiOptions;
        private readonly ITokenService _tokenService;
        private readonly ILogoutService _logoutService;

        public LoginController(ITokenService tokenService, ILogoutService logoutService, IOptions<ExternalApiOptions> apiOptions)
        {
            _tokenService = tokenService;
            _logoutService = logoutService;
            _apiOptions = apiOptions.Value;
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(string username, string password)
        {
            try
            {
                RestClient restClient = new RestClient(_apiOptions.BaseUrl);

                var request = new RestRequest("connect/token");
                request.AddParameter("grant_type", "password");
                request.AddParameter("client_id", _apiOptions.ClientId);
                request.AddParameter("client_secret", _apiOptions.ClientSecret);
                request.AddParameter("scope", _apiOptions.Scope);
                request.AddParameter("username", username);
                request.AddParameter("password", password);

                request.AddHeader("Content-Type", "application/x-www-form-urlencoded");

                RestResponse response = restClient.ExecutePostAsync(request).Result;

                if (response.IsSuccessful)
                {
                    TokenResponse accessTokenObj = JsonConvert.DeserializeObject<TokenResponse>(response.Content);
                    await _tokenService.StoreTokenDataAsync(username, accessTokenObj);

                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.Name, username),
                        new Claim(ClaimTypes.NameIdentifier, username)
                    };

                    ClaimsIdentity identity = new ClaimsIdentity(claims, "Cookie");
                    ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

                    return RedirectToAction("Index", "OTCLookup");
                }

                ViewBag.Error = "Invalid username or password.";
            }
            catch (Exception ex)
            {
                ViewBag.Error = $"An error occurred: {ex.Message}";
            }

            return View();
        }

        [HttpGet]
        [Route("Account/Logout")]
        public async Task<IActionResult> Logout()
        {
            var username = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            await _logoutService.DoLogoutAsync(username);

            return Redirect("/Login/Login");
        }
    }
}

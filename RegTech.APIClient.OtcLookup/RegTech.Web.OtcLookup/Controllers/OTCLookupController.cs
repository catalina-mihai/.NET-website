using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RegTech.Web.OtcLookup.Interfaces;
using RegTech.Web.OtcLookup.Options;
using RestSharp;
using System.Security.Claims;

namespace RegTech.Web.OtcLookup.Controllers
{
    public class OTCLookupController : Controller
    {
        private readonly ExternalApiOptions _apiOptions;
        private readonly ITokenService _tokenService;
        private readonly ILogoutService _logoutService;
        private readonly ILogger<OTCLookupController> _logger;

        public OTCLookupController(ITokenService tokenService, ILogoutService logoutService, IOptions<ExternalApiOptions> apiOptions, ILogger<OTCLookupController> logger)
        {
            _tokenService = tokenService;
            _logoutService = logoutService;
            _apiOptions = apiOptions.Value;
            _logger = logger;
        }


        public IActionResult Index()
        {
            try
            {
                var accessToken = GetAccessToken();
                if (accessToken == null)
                    return Redirect("/Login/Login");

                ViewBag.IsLoggedIn = true;

                var apiData = FetchApiDataAsync(accessToken).GetAwaiter().GetResult();

                if (apiData == null)
                    return StatusCode(500, "Error fetching API data.");

                // Process data for the view
                var allData = ProcessApiData(apiData);

                ViewBag.AssetClasses = allData["assetClass"];
                ViewBag.AllData = JsonConvert.SerializeObject(allData);

                return View();
            }
            catch (Exception ex)
            {
                //_logger.LogError($"Error in OTC Lookup: {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }

        private string GetAccessToken()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrWhiteSpace(username))
                return null;

            var token = _tokenService.GetValidTokenAsync(username).GetAwaiter().GetResult();

            if (string.IsNullOrEmpty(token))
            {
                _logoutService.DoLogoutAsync(username).GetAwaiter().GetResult();
                return null;
            }

            return token;
        }


        private async Task<List<Dictionary<string, object>>> FetchApiDataAsync(string accessToken)
        {
            var url = new Uri(new Uri(_apiOptions.BaseUrl), "api/OtcInstruments/Template/Headers");
            var client = new RestClient(url);

            var request = new RestRequest(url, method: Method.Post);
            request.AddHeader("Authorization", $"Bearer {accessToken}");

            var response = await client.GetAsync(request);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(response.Content);
            }

            //_logger.LogError($"Error fetching data from API: {response.Content.ReadAsStringAsync()}");
            throw new HttpRequestException($"Error fetching API data: {response.Content}");
        }

        private Dictionary<string, object> ProcessApiData(List<Dictionary<string, object>> apiData)
        {
            var allData = new Dictionary<string, object>
            {
                { "assetClass", new List<string>() },
                { "instrumentType", new Dictionary<string, List<string>>() },
                { "useCase", new Dictionary<string, Dictionary<string, List<string>>>() },
                { "level", new Dictionary<string, Dictionary<string, Dictionary<string, List<string>>>>() },
                { "templateVersion", new Dictionary<string, Dictionary<string, Dictionary<string, Dictionary<string, List<string>>>>>() }
            };

            // Populate allData with API response data (nested dictionaries)
            foreach (var item in apiData)
            {
                // Process `assetClass`
                var assetClass = item["assetClass"].ToString();
                if (!((List<string>)allData["assetClass"]).Contains(assetClass))
                {
                    ((List<string>)allData["assetClass"]).Add(assetClass);
                    ((List<string>)allData["assetClass"]).Sort(); // Sort alphabetically
                }

                // Process `instrumentType`
                var instrumentTypeDict = (Dictionary<string, List<string>>)allData["instrumentType"];
                var instrumentType = item["instrumentType"].ToString();
                if (!instrumentTypeDict.ContainsKey(assetClass))
                {
                    instrumentTypeDict[assetClass] = new List<string>();
                }
                if (!instrumentTypeDict[assetClass].Contains(instrumentType))
                {
                    instrumentTypeDict[assetClass].Add(instrumentType);
                    instrumentTypeDict[assetClass].Sort(); // Sort alphabetically
                }

                // Process `useCase`
                var useCaseDict = (Dictionary<string, Dictionary<string, List<string>>>)allData["useCase"];
                var useCase = item["useCase"].ToString();
                if (!useCaseDict.ContainsKey(assetClass))
                {
                    useCaseDict[assetClass] = new Dictionary<string, List<string>>();
                }
                if (!useCaseDict[assetClass].ContainsKey(instrumentType))
                {
                    useCaseDict[assetClass][instrumentType] = new List<string>();
                }
                if (!useCaseDict[assetClass][instrumentType].Contains(useCase))
                {
                    useCaseDict[assetClass][instrumentType].Add(useCase);
                    useCaseDict[assetClass][instrumentType].Sort(); // Sort alphabetically
                }

                // Process `level`
                var levelDict = (Dictionary<string, Dictionary<string, Dictionary<string, List<string>>>>)allData["level"];
                var level = item["level"].ToString();
                if (!levelDict.ContainsKey(assetClass))
                {
                    levelDict[assetClass] = new Dictionary<string, Dictionary<string, List<string>>>();
                }
                if (!levelDict[assetClass].ContainsKey(instrumentType))
                {
                    levelDict[assetClass][instrumentType] = new Dictionary<string, List<string>>();
                }
                if (!levelDict[assetClass][instrumentType].ContainsKey(useCase))
                {
                    levelDict[assetClass][instrumentType][useCase] = new List<string>();
                }
                if (!levelDict[assetClass][instrumentType][useCase].Contains(level))
                {
                    levelDict[assetClass][instrumentType][useCase].Add(level);
                    levelDict[assetClass][instrumentType][useCase].Sort(); // Sort alphabetically
                }

                // Process `templateVersion`
                var templateVersionDict = (Dictionary<string, Dictionary<string, Dictionary<string, Dictionary<string, List<string>>>>>)allData["templateVersion"];
                var templateVersion = item["templateVersion"].ToString();
                if (!templateVersionDict.ContainsKey(assetClass))
                {
                    templateVersionDict[assetClass] = new Dictionary<string, Dictionary<string, Dictionary<string, List<string>>>>();
                }
                if (!templateVersionDict[assetClass].ContainsKey(instrumentType))
                {
                    templateVersionDict[assetClass][instrumentType] = new Dictionary<string, Dictionary<string, List<string>>>();
                }
                if (!templateVersionDict[assetClass][instrumentType].ContainsKey(useCase))
                {
                    templateVersionDict[assetClass][instrumentType][useCase] = new Dictionary<string, List<string>>();
                }
                if (!templateVersionDict[assetClass][instrumentType][useCase].ContainsKey(level))
                {
                    templateVersionDict[assetClass][instrumentType][useCase][level] = new List<string>();
                }
                if (!templateVersionDict[assetClass][instrumentType][useCase][level].Contains(templateVersion))
                {
                    templateVersionDict[assetClass][instrumentType][useCase][level].Add(templateVersion);
                    templateVersionDict[assetClass][instrumentType][useCase][level].Sort(); // Sort alphabetically
                }
            }

            return allData;
        }

        // Define the model matching your `formData` structure
        public class FormData
        {
            public string assetClass { get; set; }
            public string instrumentType { get; set; }
            public string useCase { get; set; }
            public string level { get; set; }
            public string templateVersion { get; set; }
        }

        [HttpPost("search")]
        public async Task<IActionResult> FetchAttributesData([FromBody] FormData formData)
        {
            try
            {
                var accessToken = GetAccessToken();
                if (accessToken == null)
                    return Redirect("/Login/Login");

                var url = new Uri(new Uri(_apiOptions.BaseUrl), "api/OtcInstruments/Template/Attributes");
                var client = new RestClient(url);

                var request = new RestRequest(url, method: Method.Post);
                request.AddHeader("Authorization", $"Bearer {accessToken}");
                request.AddJsonBody(formData);

                var response = await client.ExecuteAsync(request);

                if (!response.IsSuccessful)
                {
                    string? errorText = response.Content;
                    throw new Exception($"Error fetching attributes from API: {errorText}");
                }

                var responseJson = JsonConvert.DeserializeObject<JObject>(response.Content);

                // Load field hierarchy
                var fieldHierarchy = LoadFieldHierarchy();
                // Load additional data
                var additionalData = LoadAdditionalData();

                // Add field hierarchy to response JSON
                if (fieldHierarchy != null)
                    responseJson["field_hierarchy"] = JToken.FromObject(fieldHierarchy);

                // Add additional data to response JSON
                if (additionalData != null)
                    responseJson["additional_data"] = JToken.FromObject(additionalData);

                // Return the response JSON
                return Ok(responseJson.ToString());
            }
            catch (Exception ex)
            {
                // Log error (you can replace this with your preferred logging framework)
                Console.Error.WriteLine(ex.Message);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private string LoadFieldHierarchy()
        {
            const string hierarchyPath = "field_hierarchy.json";

            if (!System.IO.File.Exists(hierarchyPath))
            {
                Console.Error.WriteLine("field_hierarchy.json does not exist.");
                return null;
            }

            try
            {
                var json = System.IO.File.ReadAllText(hierarchyPath);

                return json;
            }
            catch (JsonException e)
            {
                Console.Error.WriteLine($"JSON decoding error: {e.Message}");
                return null;
            }
        }


        private static string GetNewGuid()
        {
            return Guid.NewGuid().ToString();
        }

        [HttpPost("find")]
        public async Task<IActionResult> FindAsync([FromBody] dynamic data)
        {
            try
            {
                var accessToken = GetAccessToken();
                if (accessToken == null)
                    return Json(new { redirectUrl = "/Login/Login" });

                var header = data.GetProperty("header");

                // Retrieve dynamic values with defaults
                var instrumentLimit = data.TryGetProperty("instrumentLimit", out System.Text.Json.JsonElement instrumentLimitValue)
                    ? Convert.ToInt32(instrumentLimitValue.GetString())
                    : 5;

                string templateSearchDirection = data.TryGetProperty("templateSearchDirection", out System.Text.Json.JsonElement templateSearchDirectionValue)
                    ? templateSearchDirectionValue.GetString()
                    : "HighestToLowest";

                int expiryDatesSpans = data.TryGetProperty("expiryDatesSpans", out System.Text.Json.JsonElement expiryDatesSpansValue)
                    ? Convert.ToInt32(expiryDatesSpansValue.GetString())
                    : 1;

                // Construct payload
                var payload = new
                {
                    header = new
                    {
                        assetClass = header.GetProperty("assetClass"),
                        instrumentType = header.GetProperty("instrumentType"),
                        useCase = header.GetProperty("useCase"),
                        level = header.GetProperty("level"),
                        templateVersion = header.GetProperty("templateVersion")
                    },
                    attributes = data.GetProperty("attributes"),
                    instrumentLimit = instrumentLimit,
                    templateSearchDirection = templateSearchDirection,
                    expiryDatesSpans = expiryDatesSpans,
                    extractAttributes = true,
                    extractDerived = true,
                    deriveCfiCodeProperties = true
                };

                var url = new Uri(new Uri(_apiOptions.BaseUrl), "api/OtcInstruments/Template/Instruments");
                var client = new RestClient(url);
                var request = new RestRequest(url, method: Method.Post);
                request.AddHeader("Authorization", $"Bearer {accessToken}");
                request.AddJsonBody(payload);

                var response = await client.ExecuteAsync(request);

                if (response.IsSuccessful)
                {
                    var responseData = JsonConvert.DeserializeObject<JObject>(response.Content);

                    if (responseData["instrumentCount"].Value<int>() == 0)
                    {
                        var searchHeader = data.GetProperty("header");

                        // Get the original correlation from the response
                        var correlationId = response.Headers.FirstOrDefault(h => h.Name.Equals("x-correlation-id", StringComparison.OrdinalIgnoreCase))?.Value;

                        // Create a similar object for no instruments case
                        var noInstrumentsResponse = new RestResponse
                        {
                            Content = JsonConvert.SerializeObject(new
                            {
                                instrumentCount = 0,
                                recordsLimit = 5,
                                instruments = new Dictionary<string, object>
                                {
                                    ["NO_INSTRUMENTS_FOUND"] = new
                                    {
                                        identifier = "No matching instruments found",
                                        identifierType = "N/A",
                                        lastUpdateDateTime = "2024-07-05T00:00:00Z",
                                        annaDsbStatus = "N/A",
                                        annaDsbStatusReason = "N/A",
                                        classificationType = "N/A",
                                        parentIdentifier = "N/A",
                                        parentIdentifierType = "N/A",
                                        attributes = new
                                        {
                                            NotionalCurrency = "N/A",
                                            ExpiryDate = "2024-07-05",
                                            OtherNotionalCurrency = "N/A",
                                            DeliveryType = "N/A",
                                            PriceMultiplier = 1
                                        },
                                        derived = new
                                        {
                                            assetClass = searchHeader.GetProperty("assetClass").GetString(),
                                            instrumentType = searchHeader.GetProperty("instrumentType").GetString(),
                                            useCase = searchHeader.GetProperty("useCase").GetString(),
                                            level = searchHeader.GetProperty("level").GetString() ?? "",
                                            templateVersion = searchHeader.GetProperty("templateVersion").GetString()
                                        }
                                    }
                                }
                            }),
                            Headers = new List<HeaderParameter>
                            {
                                new HeaderParameter("x-correlation-id", correlationId)
                            }
                        };

                        return Ok(noInstrumentsResponse);
                    }
                    return Ok(response);
                }

                _logger.LogError("API Error Response: {Content}", response.Content);
                throw new Exception($"Error fetching instruments: {response.Content}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in Find: {ex.Message}");
                return BadRequest(new { error = ex.Message });
            }
        }
        private string LoadAdditionalData()
        {
            const string additionalDataPath = "additional_data.json";

            if (!System.IO.File.Exists(additionalDataPath))
            {
                _logger.LogError("additional_data.json does not exist");
                Console.Error.WriteLine("additional_data.json does not exist.");
                return null;
            }
            try
            {
                var json = System.IO.File.ReadAllText(additionalDataPath);
                _logger.LogInformation("additional_data.json loaded successfully.");
                return json;
            }
            catch (JsonException e)
            {
                _logger.LogError($"JSON decoding error: {e.Message}");
                return null;
            }
            catch (Exception e)
            {
                _logger.LogError($"Unexpected error loading additional_data.json: {e.Message}");
                return null;
            }
        }

    }
}

import {
	createContext,
	useState,
	useContext,
	useEffect,
	useRef,
	useCallback,
} from "react";
import { AuthService } from "../services/AuthService";
import { calculateDelayFromJwt } from "../utils/helpers";

let AuthContext = createContext(null);

function AuthProvider({ children }) {
	const [accessToken, setAccessToken] = useState(null);
	const [isTokenRefreshing, setIsTokenRefreshing] = useState(true);

	const refreshInterval = useRef();
	const abortController = useRef(new AbortController());
	const isMounted = useRef(false);

	const getRefreshToken = useCallback(async () => {
		console.log("getting refresh token");
		try {
			const { accessToken: token } = await AuthService.refreshToken();
			if (!!token) {
				setAccessToken(token);
			}
		} finally {
			setIsTokenRefreshing(false);
		}
	}, []);

	useEffect(() => {
		const currentAbortController = abortController.current;

		const subscribeAutomaticTokenRefresh = async (delay) => {
			if (!refreshInterval.current) {
				refreshInterval.current = window.setTimeout(async () => {
					await getRefreshToken();
				}, delay);
			}
		};

		if (!isMounted.current) {
			console.log("try getting access token on page refresh");
			setIsTokenRefreshing(true);
			getRefreshToken();
			isMounted.current = true;
		} else if (!!accessToken) {
			console.log("automatic refresh subscription");
			const delay = calculateDelayFromJwt(accessToken);
			if (delay) {
				subscribeAutomaticTokenRefresh(delay);
			}
		}
		return () => {
			console.log("cleanup");
			window.clearTimeout(refreshInterval.current);
			currentAbortController.abort();
		};
	}, [getRefreshToken, accessToken]);

	const login = async (credentials) => {
		const { accessToken: token } = await AuthService.login(credentials);
		setAccessToken(token);
	};

	const register = async (userInput) => {
		const { acessToken: token } = await AuthService.register(userInput);
		setAccessToken(token);
	};

	const logout = async () => {
		console.log("logging out");
		console.log(accessToken);
		await AuthService.logout(accessToken);
		setAccessToken(null);
	};

	let value = {
		isAuthenticated: !!accessToken,
		accessToken,
		isTokenRefreshing,
		login,
		logout,
		register,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
	return useContext(AuthContext);
}

export { AuthProvider, useAuth };

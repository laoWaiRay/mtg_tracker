"use client";
import styles from "../styles.module.css";
import TextInput from "@/components/TextInput";
import { Dispatch, SetStateAction, useState } from "react";
import ButtonPrimary from "@/components/ButtonPrimary";
import Link from "next/link";
import { useLogin } from "@/hooks/useLogin";
import {
	LoginFormData as FormData,
	LoginErrors as Errors,
	loginFormErrorFieldMap as errorFieldMap,
	requiredEmail,
	requiredPassword,
} from "@/types/formValidation";
import useForm from "@/hooks/useForm";
import { renderErrors } from "@/helpers/renderErrors";
import { UNAUTHORIZED } from "@/constants/httpStatus";
import { handleServerApiError } from "@/helpers/validationHelpers";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { GoogleLoginRequestDTO } from "@/types/client";
import { api } from "@/generated/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ActionType } from "@/context/AuthContext";

const initialValues: FormData = {
	email: "",
	password: "",
};

export default function LoginPage() {
	const { values, errors, handleChange, handleSubmit } = useForm<
		FormData,
		Errors
	>(initialValues, validateForm);
	const [isPwHidden, setIsPwHidden] = useState(true);
  const { dispatch } = useAuth();
	const { loginAsync } = useLogin();
	const { email, password } = values;
	const [isFetching, setIsFetching] = useState(false);
	const router = useRouter();

	async function onSubmit(
		_: FormData,
		_errors?: Partial<Errors>,
		_setErrors?: Dispatch<SetStateAction<Partial<Errors>>>
	) {
		try {
			setIsFetching(true);
			await loginAsync(email, password);
			if (_setErrors) {
				_setErrors({});
			}
			setIsFetching(false);
		} catch (error) {
			setIsFetching(false);
			handleServerApiError<Errors>(
				[UNAUTHORIZED],
				error,
				errorFieldMap,
				Errors,
				_setErrors,
				_errors
			);
		}
	}

	async function handleGoogleLogin(credentialResponse: CredentialResponse) {
		const idToken = credentialResponse.credential;
		if (idToken) {
			const request: GoogleLoginRequestDTO = {
				idToken,
			};
			const response = await api.postApiUserauthgoogle(request);
			const { accessToken, refreshToken, userData } = response;

			// Set cookies
			await fetch("/api/cookies", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ accessToken, refreshToken }),
			});
      
      dispatch({ type: ActionType.LOGIN, payload: userData });

			router.push("/commandzone");
		}
	}

	const invalidLoginMessages =
		errors?.invalidUsernameOrPassword &&
		renderErrors(errors.invalidUsernameOrPassword);
	const emailErrorMessages = errors?.email && renderErrors(errors.email);
	const passwordErrorMessages =
		errors?.password && renderErrors(errors.password);
	const unknownErrorMessages = errors?.unknown && renderErrors(errors.unknown);

	return (
		<div
			className={`${styles.gridB} flex flex-col justify-center items-center lg:items-start w-full z-20`}
		>
			<form
				className={`flex flex-col justify-center mx-0 xl:mx-12 lg:my-12 px-2`}
				onSubmit={(e) => handleSubmit(onSubmit, e)}
			>
				<h1 className="text-[1.4rem] lg:text-[1.5rem] mb-8 text-fg-light select-none font-light pt-6">
					Log in to your account
				</h1>

				<div>{invalidLoginMessages}</div>
				<div>{unknownErrorMessages}</div>
				<TextInput
					name="email"
					label="Email"
					value={email}
					onChange={(e) => handleChange(e)}
					errorMessage={emailErrorMessages}
				/>
				<TextInput
					type="password"
					hidden={isPwHidden}
					toggleHidden={() => setIsPwHidden(!isPwHidden)}
					name="password"
					label="Password"
					value={password}
					onChange={(e) => handleChange(e)}
					errorMessage={passwordErrorMessages}
					autoComplete="current-password"
				/>
				<Link
					href="/forgot-password"
					className="self-end text-fg font-normal rounded p-sm -mt-1"
				>
					Forgot password?
				</Link>
				<ButtonPrimary
					type="submit"
					onClick={() => {}}
					uppercase={false}
					disabled={isFetching}
				>
					Log in
				</ButtonPrimary>
				<div className="text-fg-dark flex justify-center items-center">
					<div className="bg-fg-dark h-[1px] grow mr-4 ml-1" />
					<span className="select-none">OR</span>
					<div className="bg-fg-dark h-[1px] grow ml-4 mr-1" />
				</div>
				<div className="w-full my-4 flex justify-center">
					<GoogleLogin
						onSuccess={handleGoogleLogin}
						onError={() => console.log("Login Failed")}
						size="large"
						theme="outline"
						shape="rectangular"
						text="signin"
						width={280}
					/>
				</div>
				<div className="flex justify-center items-center">
					{"Don't have an account? "}
					<Link href="/register" className="link px-1">
						Sign up
					</Link>
				</div>
			</form>
		</div>
	);
}

function validateForm(data: FormData) {
	const errors = new Errors();
	const { email, password } = data;
	if (!email) {
		errors.email.push(requiredEmail);
	}
	if (!password) {
		errors.password.push(requiredPassword);
	}
	return errors;
}

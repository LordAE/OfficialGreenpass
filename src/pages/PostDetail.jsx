
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Post } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, User, Clock, ArrowLeft } from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function PostDetail() {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const slug = urlParams.get('slug');

            if (slug) {
                try {
                    const fetchedPosts = await Post.filter({ slug: slug });
                    if (fetchedPosts.length > 0) {
                        setPost(fetchedPosts[0]);
                    } else {
                        setError("Post not found.");
                    }
                } catch (err) {
                    console.error("Failed to fetch post:", err);
                    setError("An error occurred while fetching the post.");
                }
            } else {
                setError("No post specified.");
            }
            setLoading(false);
        };
        fetchPost();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-8">
                <h2 className="text-2xl font-bold mb-2">Could Not Load Post</h2>
                <p className="text-gray-600 mb-6">{error || "The requested blog post could not be found."}</p>
                <Link to={createPageUrl('Blog')}>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Button>
                </Link>
            </div>
        );
    }
    
    const formattedDate = post.created_date 
      ? new Date(post.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <Link to={createPageUrl('Blog')} className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center gap-2">
                         <ArrowLeft className="w-4 h-4" />
                         Back to all posts
                    </Link>
                </div>
                <div className="lg:grid lg:grid-cols-12 lg:gap-12">
                    <main className="lg:col-span-8">
                         {post.coverImageUrl && (
                            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                                <img src={post.coverImageUrl} alt={post.title} className="w-full h-auto object-cover" />
                            </div>
                        )}
                        {post.videoUrl && (
                             <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                                <YouTubeEmbed url={post.videoUrl} className="w-full aspect-video" />
                            </div>
                        )}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4">{post.title}</h1>
                         
                        <div 
                            className="prose prose-lg max-w-none prose-green prose-headings:font-bold prose-a:text-green-600 hover:prose-a:text-green-700"
                            dangerouslySetInnerHTML={{ __html: post.content }} 
                        />
                    </main>

                    <aside className="lg:col-span-4 mt-12 lg:mt-0">
                        <div className="sticky top-24 space-y-8">
                            <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle>About this post</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p className="text-gray-500">Author</p>
                                            <p className="font-semibold text-gray-800">{post.author || 'GreenPass Team'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p className="text-gray-500">Published</p>
                                            <p className="font-semibold text-gray-800">{formattedDate}</p>
                                        </div>
                                    </div>
                                    {post.readTime && (
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-gray-500" />
                                            <div>
                                                <p className="text-gray-500">Read time</p>
                                                <p className="font-semibold text-gray-800">{post.readTime}</p>
                                            </div>
                                        </div>
                                    )}
                                    {post.category && (
                                        <div className="pt-2">
                                            <Badge>{post.category}</Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
